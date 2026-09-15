import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICampaignRepository } from '../repositories/i-campaign.repository'
import { IAdSetRepository } from '../repositories/i-ad-set.repository'
import { IAdRepository } from '../repositories/i-ad.repository'
import { IMetaAdAccountRepository } from '../repositories/i-meta-ad-account.repository'
import { IAdDailyMetricRepository } from '../repositories/i-ad-daily-metric.repository'
import { IAdPlatformAdapter } from '../services/i-ad-platform.adapter'

export interface SyncCampaignMetricsRequest {
  campaignId: string
  /** Intervalo explícito. Quando ausente, usa a janela recente padrão. */
  dateRange?: { since: string; until: string }
  /** Quantos dias para trás recoletar. Padrão 7. */
  days?: number
  /** Costura de teste; em produção é o relógio. */
  now?: Date
}

export interface SyncCampaignMetricsResponse {
  synced: number
}

export type SyncCampaignMetricsResult = Either<Error, SyncCampaignMetricsResponse>

/**
 * Quantos dias recoletar por padrão.
 *
 * Algumas métricas da Meta chegam com até 48h de atraso. Buscar só o dia
 * anterior congelava números que ainda iam subir, e o painel passava a mostrar
 * menos do que aconteceu — sem nunca se corrigir, porque aquele dia jamais era
 * perguntado de novo.
 *
 * Sete dias cobrem as 48h com folga e não custam nada a mais: o adapter recebe
 * um intervalo e devolve as linhas de cada dia, então a janela inteira é UMA
 * chamada, igual a pedir um dia só.
 */
const DEFAULT_DAYS = 7
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Janela que termina ontem — hoje ainda está acontecendo e não fecha. */
function recentRange(days: number, now: Date): { since: string; until: string } {
  const until = new Date(now.getTime() - MS_PER_DAY)
  const since = new Date(until.getTime() - (days - 1) * MS_PER_DAY)
  return { since: iso(since), until: iso(until) }
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

@Injectable()
export class SyncCampaignMetricsUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository,
    private readonly adSetRepo: IAdSetRepository,
    private readonly adRepo: IAdRepository,
    private readonly metaAdAccountRepo: IMetaAdAccountRepository,
    private readonly adDailyMetricRepo: IAdDailyMetricRepository,
    private readonly adapter: IAdPlatformAdapter,
  ) {}

  async execute(req: SyncCampaignMetricsRequest): Promise<SyncCampaignMetricsResult> {
    // 1. Find campaign
    const campaign = await this.campaignRepo.findById(req.campaignId)
    if (!campaign) {
      return left(new Error(`Campaign not found: ${req.campaignId}`))
    }

    // 2. Get MetaAdAccount
    const adAccount = await this.metaAdAccountRepo.findByCustomerId(campaign.customerId)
    if (!adAccount) {
      return right({ synced: 0 })
    }

    // 3. Get all AdSets
    const adSets = await this.adSetRepo.findByCampaignId(campaign.id.value)

    // 4. Collect all Ads with metaAdId
    const metaAdIds: string[] = []
    const adIdByMetaId = new Map<string, string>()

    for (const adSet of adSets) {
      const ads = await this.adRepo.findByAdSetId(adSet.id.value)
      for (const ad of ads) {
        if (ad.metaAdId) {
          metaAdIds.push(ad.metaAdId)
          adIdByMetaId.set(ad.metaAdId, ad.id.value)
        }
      }
    }

    // 5. No ads with metaAdId
    if (metaAdIds.length === 0) {
      return right({ synced: 0 })
    }

    // 6. Call adapter.syncMetrics
    // A gravação é upsert por (anúncio, dia), então recoletar um dia já
    // gravado corrige o número em vez de duplicar a linha.
    const dateRange =
      req.dateRange ?? recentRange(req.days ?? DEFAULT_DAYS, req.now ?? new Date())
    const results = await this.adapter.syncMetrics({
      adAccountId: adAccount.adAccountId,
      adIds: metaAdIds,
      dateRange,
    })

    // 7. Upsert metrics
    for (const row of results) {
      const localAdId = adIdByMetaId.get(row.metaAdId)
      if (!localAdId) continue

      await this.adDailyMetricRepo.upsert({
        adId: localAdId,
        campaignId: campaign.id.value,
        date: new Date(row.date),
        impressions: row.impressions,
        clicks: row.clicks,
        reach: row.reach,
        spent: row.spend,
        conversions: row.conversions,
        results: row.results,
        ctr: row.ctr,
        cpc: row.cpc,
        cpm: row.cpm,
        cpp: row.cpp,
        roas: row.roas,
        frequency: row.frequency,
      })
    }

    return right({ synced: results.length })
  }
}
