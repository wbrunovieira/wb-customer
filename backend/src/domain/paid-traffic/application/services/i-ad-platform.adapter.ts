export interface CreateMetaCampaignParams {
  adAccountId: string
  name: string
  objective: string
  status: 'ACTIVE' | 'PAUSED'
  specialAdCategories?: string[]
}

export interface CreateMetaAdSetParams {
  adAccountId: string
  campaignId: string
  name: string
  status: 'ACTIVE' | 'PAUSED'
  dailyBudget?: number
  lifetimeBudget?: number
  startTime?: string
  endTime?: string
  targeting: Record<string, unknown>
  optimizationGoal: string
  billingEvent: string
}

export interface CreateMetaAdParams {
  adAccountId: string
  adSetId: string
  name: string
  status: 'ACTIVE' | 'PAUSED'
  pageId: string
  imageUrl?: string
  videoId?: string
  primaryText: string
  headline?: string
  description?: string
  callToAction: string
  link: string
}

export interface SyncMetricsParams {
  adAccountId: string
  adIds: string[]
  dateRange: { since: string; until: string }
}

export interface AdMetricsResult {
  metaAdId: string
  date: string
  impressions: number
  clicks: number
  reach: number
  spend: number
  conversions: number
  results: number
  ctr: number | null
  cpc: number | null
  cpm: number | null
  cpp: number | null
  roas: number | null
  frequency: number | null
}

export interface MetaAdAccountEntry {
  id: string
  name: string
  currency: string
  accountStatus: number
}

export interface CreateMetaAdAccountParams {
  bmId: string
  name: string
  currency?: string
  timezoneId?: number
  endAdvertiser?: string
}

export abstract class IAdPlatformAdapter {
  abstract createCampaign(params: CreateMetaCampaignParams): Promise<{ externalId: string }>
  abstract createAdSet(params: CreateMetaAdSetParams): Promise<{ externalId: string }>
  abstract uploadImage(adAccountId: string, imageBuffer: Buffer, filename: string): Promise<{ imageHash: string; url: string }>
  abstract createAd(params: CreateMetaAdParams): Promise<{ externalId: string; creativeId: string }>
  abstract pauseCampaign(adAccountId: string, metaCampaignId: string): Promise<void>
  abstract resumeCampaign(adAccountId: string, metaCampaignId: string): Promise<void>
  abstract syncMetrics(params: SyncMetricsParams): Promise<AdMetricsResult[]>
  abstract listAdAccounts(bmId: string): Promise<MetaAdAccountEntry[]>
  abstract createAdAccount(params: CreateMetaAdAccountParams): Promise<{ id: string; name: string }>
}
