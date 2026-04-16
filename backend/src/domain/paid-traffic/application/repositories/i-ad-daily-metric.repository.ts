export interface AdDailyMetricData {
  id?: string
  adId: string
  campaignId: string
  date: Date
  impressions: number
  clicks: number
  reach: number
  spent: number
  conversions: number
  results: number
  ctr?: number | null
  cpc?: number | null
  cpm?: number | null
  cpp?: number | null
  roas?: number | null
  frequency?: number | null
}

export interface DateRange {
  since: Date
  until: Date
}

export abstract class IAdDailyMetricRepository {
  abstract findByAdId(adId: string): Promise<AdDailyMetricData[]>
  abstract findByCampaignId(campaignId: string, dateRange?: DateRange): Promise<AdDailyMetricData[]>
  abstract upsert(metric: AdDailyMetricData): Promise<void>
}
