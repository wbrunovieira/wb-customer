import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ICampaignRepository, PaginatedCampaigns } from '../repositories/i-campaign.repository'
import { AdCampaignStatus, CampaignPublishStatus } from '../../enterprise/entities/campaign'

export interface ListCustomerCampaignsRequest {
  customerId: string
  status?: AdCampaignStatus
  publishStatus?: CampaignPublishStatus
  page?: number
  limit?: number
}

export type ListCustomerCampaignsResult = Either<Error, PaginatedCampaigns>

@Injectable()
export class ListCustomerCampaignsUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository) {}

  async execute(req: ListCustomerCampaignsRequest): Promise<ListCustomerCampaignsResult> {
    const result = await this.campaignRepo.findByCustomerId(req.customerId, {
      status: req.status,
      publishStatus: req.publishStatus,
      page: req.page,
      limit: req.limit,
    })

    return right(result)
  }
}
