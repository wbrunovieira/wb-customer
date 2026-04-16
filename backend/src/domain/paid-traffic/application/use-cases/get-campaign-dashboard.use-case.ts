import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICampaignRepository } from '../repositories/i-campaign.repository'
import { IAdSetRepository } from '../repositories/i-ad-set.repository'
import { IAdRepository } from '../repositories/i-ad.repository'
import { IAdDailyMetricRepository, AdDailyMetricData } from '../repositories/i-ad-daily-metric.repository'
import { Campaign } from '../../enterprise/entities/campaign'

export interface GetCampaignDashboardRequest {
  campaignId: string
  days?: number
}

export interface DashboardTotals {
  impressions: number
  clicks: number
  reach: number
  spent: number
  conversions: number
  results: number
  ctr: number | null
  cpc: number | null
  cpm: number | null
  roas: number | null
}

export interface DailySeriesEntry {
  date: string
  impressions: number
  clicks: number
  reach: number
  spent: number
  conversions: number
}

export interface AdSetBreakdownEntry {
  adSetId: string
  adSetName: string
  impressions: number
  clicks: number
  spent: number
  conversions: number
}

export interface GetCampaignDashboardResponse {
  campaign: Campaign
  totals: DashboardTotals
  dailySeries: DailySeriesEntry[]
  adSetBreakdown: AdSetBreakdownEntry[]
}

export type GetCampaignDashboardResult = Either<Error, GetCampaignDashboardResponse>

@Injectable()
export class GetCampaignDashboardUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository,
    private readonly adSetRepo: IAdSetRepository,
    private readonly adRepo: IAdRepository,
    private readonly metricRepo: IAdDailyMetricRepository,
  ) {}

  async execute(req: GetCampaignDashboardRequest): Promise<GetCampaignDashboardResult> {
    const campaign = await this.campaignRepo.findById(req.campaignId)
    if (!campaign) {
      return left(new Error(`Campaign not found: ${req.campaignId}`))
    }

    const days = req.days ?? 30
    const until = new Date()
    const since = new Date()
    since.setDate(since.getDate() - days)

    const metrics = await this.metricRepo.findByCampaignId(req.campaignId, { since, until })

    const totals = this.aggregateTotals(metrics)
    const dailySeries = this.buildDailySeries(metrics)

    const adSets = await this.adSetRepo.findByCampaignId(req.campaignId)
    const adSetBreakdown = await this.buildAdSetBreakdown(adSets, metrics)

    return right({ campaign, totals, dailySeries, adSetBreakdown })
  }

  private aggregateTotals(metrics: AdDailyMetricData[]): DashboardTotals {
    const impressions = metrics.reduce((s, m) => s + m.impressions, 0)
    const clicks = metrics.reduce((s, m) => s + m.clicks, 0)
    const reach = metrics.reduce((s, m) => s + m.reach, 0)
    const spent = metrics.reduce((s, m) => s + m.spent, 0)
    const conversions = metrics.reduce((s, m) => s + m.conversions, 0)
    const results = metrics.reduce((s, m) => s + m.results, 0)

    return {
      impressions,
      clicks,
      reach,
      spent,
      conversions,
      results,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
      cpc: clicks > 0 ? spent / clicks : null,
      cpm: impressions > 0 ? (spent / impressions) * 1000 : null,
      roas: spent > 0 ? conversions / spent : null,
    }
  }

  private buildDailySeries(metrics: AdDailyMetricData[]): DailySeriesEntry[] {
    const byDate = new Map<string, DailySeriesEntry>()

    for (const m of metrics) {
      const date = m.date instanceof Date ? m.date.toISOString().split('T')[0] : String(m.date)
      const existing = byDate.get(date)
      if (existing) {
        existing.impressions += m.impressions
        existing.clicks += m.clicks
        existing.reach += m.reach
        existing.spent += m.spent
        existing.conversions += m.conversions
      } else {
        byDate.set(date, {
          date,
          impressions: m.impressions,
          clicks: m.clicks,
          reach: m.reach,
          spent: m.spent,
          conversions: m.conversions,
        })
      }
    }

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
  }

  private async buildAdSetBreakdown(
    adSets: Awaited<ReturnType<IAdSetRepository['findByCampaignId']>>,
    metrics: AdDailyMetricData[],
  ): Promise<AdSetBreakdownEntry[]> {
    const breakdown: AdSetBreakdownEntry[] = []

    for (const adSet of adSets) {
      const ads = await this.adRepo.findByAdSetId(adSet.id.value)
      const adIds = new Set(ads.map((a) => a.id.value))

      const adSetMetrics = metrics.filter((m) => adIds.has(m.adId))

      breakdown.push({
        adSetId: adSet.id.value,
        adSetName: adSet.name,
        impressions: adSetMetrics.reduce((s, m) => s + m.impressions, 0),
        clicks: adSetMetrics.reduce((s, m) => s + m.clicks, 0),
        spent: adSetMetrics.reduce((s, m) => s + m.spent, 0),
        conversions: adSetMetrics.reduce((s, m) => s + m.conversions, 0),
      })
    }

    return breakdown
  }
}
