export interface CreativePerformanceRecord {
  id?: string
  creativeId: string
  platform: string
  campaignId?: string | null
  impressions: number
  clicks: number
  conversions: number
  spend: number
  ctr?: number | null
  cpc?: number | null
  cpa?: number | null
  roas?: number | null
  startDate: Date
  endDate?: Date | null
  notes?: string | null
}

export abstract class ICreativePerformanceRepository {
  abstract create(record: CreativePerformanceRecord): Promise<string>
  abstract findByCreativeId(creativeId: string): Promise<CreativePerformanceRecord[]>
}
