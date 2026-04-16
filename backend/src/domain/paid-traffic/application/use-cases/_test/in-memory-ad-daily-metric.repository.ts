import {
  IAdDailyMetricRepository,
  AdDailyMetricData,
  DateRange,
} from '../../repositories/i-ad-daily-metric.repository'

export class InMemoryAdDailyMetricRepository implements IAdDailyMetricRepository {
  public items: AdDailyMetricData[] = []

  async findByAdId(adId: string): Promise<AdDailyMetricData[]> {
    return this.items.filter((m) => m.adId === adId)
  }

  async findByCampaignId(campaignId: string, dateRange?: DateRange): Promise<AdDailyMetricData[]> {
    let filtered = this.items.filter((m) => m.campaignId === campaignId)
    if (dateRange) {
      filtered = filtered.filter(
        (m) => m.date >= dateRange.since && m.date <= dateRange.until,
      )
    }
    return filtered
  }

  async upsert(metric: AdDailyMetricData): Promise<void> {
    const idx = this.items.findIndex(
      (m) => m.adId === metric.adId && m.date.getTime() === metric.date.getTime(),
    )
    if (idx >= 0) {
      this.items[idx] = { ...this.items[idx], ...metric }
    } else {
      this.items.push(metric)
    }
  }
}
