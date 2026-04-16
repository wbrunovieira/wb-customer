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
  dateRange?: { since: string; until: string }
}

export interface SyncCampaignMetricsResponse {
  synced: number
}

export type SyncCampaignMetricsResult = Either<Error, SyncCampaignMetricsResponse>

function yesterdayRange(): { since: string; until: string } {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const iso = yesterday.toISOString().slice(0, 10)
  return { since: iso, until: iso }
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
    const dateRange = req.dateRange ?? yesterdayRange()
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
