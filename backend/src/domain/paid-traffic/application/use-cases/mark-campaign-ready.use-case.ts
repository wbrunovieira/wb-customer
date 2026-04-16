import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICampaignRepository } from '../repositories/i-campaign.repository'

export interface MarkCampaignReadyRequest {
  campaignId: string
}

export interface MarkCampaignReadyResponse {
  success: true
}

export type MarkCampaignReadyResult = Either<Error, MarkCampaignReadyResponse>

@Injectable()
export class MarkCampaignReadyUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository) {}

  async execute(req: MarkCampaignReadyRequest): Promise<MarkCampaignReadyResult> {
    const campaign = await this.campaignRepo.findById(req.campaignId)
    if (!campaign) {
      return left(new Error(`Campaign not found: ${req.campaignId}`))
    }

    if (campaign.publishStatus !== 'draft') {
      return left(new Error(`Campaign must be in draft status to mark as ready. Current status: ${campaign.publishStatus}`))
    }

    campaign.markReady()
    await this.campaignRepo.save(campaign)

    return right({ success: true })
  }
}
