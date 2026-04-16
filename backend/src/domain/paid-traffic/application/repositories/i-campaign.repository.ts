import { Campaign, AdCampaignStatus, CampaignPublishStatus } from '../../enterprise/entities/campaign'

export interface FindManyCampaignsParams {
  status?: AdCampaignStatus
  publishStatus?: CampaignPublishStatus
  page?: number
  limit?: number
}

export interface PaginatedCampaigns {
  items: Campaign[]
  total: number
}

export abstract class ICampaignRepository {
  abstract findById(id: string): Promise<Campaign | null>
  abstract findByCustomerId(customerId: string, params?: FindManyCampaignsParams): Promise<PaginatedCampaigns>
  abstract findAllPublished(): Promise<Campaign[]>
  abstract save(campaign: Campaign): Promise<void>
  abstract delete(id: string): Promise<void>
}
