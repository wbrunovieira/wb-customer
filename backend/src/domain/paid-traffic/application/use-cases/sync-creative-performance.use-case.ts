import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICreativePerformanceRepository } from '@/domain/creatives/application/repositories/i-creative-performance.repository'
import { ICampaignRepository } from '../repositories/i-campaign.repository'
import { IAdSetRepository } from '../repositories/i-ad-set.repository'
import { IAdRepository } from '../repositories/i-ad.repository'
import {
  IAdDailyMetricRepository,
  AdDailyMetricData,
} from '../repositories/i-ad-daily-metric.repository'

/** Identifica as linhas geradas por este sync, para não colidir com o que é digitado à mão. */
export const META_SYNC_SOURCE = 'meta_sync'

/**
 * Placement não é discriminado: uma campanha da Meta roda em Facebook e Instagram ao
 * mesmo tempo e a API só devolveria a separação com um breakdown adicional.
 */
export const META_SYNC_PLATFORM = 'meta'

export interface SyncCreativePerformanceRequest {
  campaignId: string
}

export interface SyncCreativePerformanceResponse {
  /** Quantidade de criativos que receberam linha de performance. */
  synced: number
}

export type SyncCreativePerformanceResult = Either<Error, SyncCreativePerformanceResponse>

interface CreativeAggregate {
  impressions: number
  clicks: number
  spend: number
  conversions: number
  startDate: Date
  endDate: Date
}

/**
 * Agrega as métricas diárias dos anúncios de uma campanha por criativo e grava o
 * resultado em CreativePerformance.
 *
 * Antes disso, a performance por criativo só existia se alguém digitasse — mesmo com o
 * dado já chegando da Meta todo dia. É o número que sustenta a escolha do campeão nas
 * estratégias de exploração e lapidação.
 */
@Injectable()
export class SyncCreativePerformanceUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository,
    private readonly adSetRepo: IAdSetRepository,
    private readonly adRepo: IAdRepository,
    private readonly metricRepo: IAdDailyMetricRepository,
    private readonly performanceRepo: ICreativePerformanceRepository,
  ) {}

  async execute(req: SyncCreativePerformanceRequest): Promise<SyncCreativePerformanceResult> {
    const campaign = await this.campaignRepo.findById(req.campaignId)
    if (!campaign) {
      return left(new Error(`Campaign not found: ${req.campaignId}`))
    }

    const metrics = await this.metricRepo.findByCampaignId(req.campaignId)
    const creativeByAdId = await this.mapAdsToCreatives(req.campaignId)

    const aggregates = this.aggregateByCreative(metrics, creativeByAdId)

    for (const [creativeId, totals] of aggregates) {
      await this.performanceRepo.upsertSynced({
        creativeId,
        campaignId: req.campaignId,
        source: META_SYNC_SOURCE,
        platform: META_SYNC_PLATFORM,
        impressions: totals.impressions,
        clicks: totals.clicks,
        conversions: totals.conversions,
        spend: totals.spend,
        ctr: ratio(totals.clicks, totals.impressions, 100),
        cpc: ratio(totals.spend, totals.clicks),
        cpa: ratio(totals.spend, totals.conversions),
        roas: ratio(totals.conversions, totals.spend),
        startDate: totals.startDate,
        endDate: totals.endDate,
      })
    }

    return right({ synced: aggregates.size })
  }

  /** Percorre conjuntos e anúncios da campanha para saber qual criativo cada anúncio usa. */
  private async mapAdsToCreatives(campaignId: string): Promise<Map<string, string>> {
    const byAdId = new Map<string, string>()
    const adSets = await this.adSetRepo.findByCampaignId(campaignId)

    for (const adSet of adSets) {
      const ads = await this.adRepo.findByAdSetId(adSet.id.value)
      for (const ad of ads) {
        // Anúncio sem criativo vinculado não tem performance para atribuir.
        if (ad.creativeId) {
          byAdId.set(ad.id.value, ad.creativeId)
        }
      }
    }

    return byAdId
  }

  private aggregateByCreative(
    metrics: AdDailyMetricData[],
    creativeByAdId: Map<string, string>,
  ): Map<string, CreativeAggregate> {
    const byCreative = new Map<string, CreativeAggregate>()

    for (const metric of metrics) {
      const creativeId = creativeByAdId.get(metric.adId)
      if (!creativeId) continue

      const current = byCreative.get(creativeId)

      if (!current) {
        byCreative.set(creativeId, {
          impressions: metric.impressions,
          clicks: metric.clicks,
          spend: metric.spent,
          conversions: metric.conversions,
          startDate: metric.date,
          endDate: metric.date,
        })
        continue
      }

      current.impressions += metric.impressions
      current.clicks += metric.clicks
      current.spend += metric.spent
      current.conversions += metric.conversions
      if (metric.date < current.startDate) current.startDate = metric.date
      if (metric.date > current.endDate) current.endDate = metric.date
    }

    return byCreative
  }
}

/**
 * Mesmas fórmulas do GetCampaignDashboardUseCase, para que a comparação entre criativos
 * bata com os números da campanha. Denominador zero vira null em vez de Infinity/NaN.
 */
function ratio(numerator: number, denominator: number, scale = 1): number | null {
  if (denominator <= 0) return null
  return (numerator / denominator) * scale
}
