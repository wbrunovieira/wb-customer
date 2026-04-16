import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICampaignRepository } from '../repositories/i-campaign.repository'

export interface DeleteCampaignRequest {
  campaignId: string
}

export interface DeleteCampaignResponse {
  success: true
}

export type DeleteCampaignResult = Either<Error, DeleteCampaignResponse>

@Injectable()
export class DeleteCampaignUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository) {}

  async execute(req: DeleteCampaignRequest): Promise<DeleteCampaignResult> {
    const campaign = await this.campaignRepo.findById(req.campaignId)
    if (!campaign) {
      return left(new Error(`Campaign not found: ${req.campaignId}`))
    }

    await this.campaignRepo.delete(req.campaignId)

    return right({ success: true })
  }
}
