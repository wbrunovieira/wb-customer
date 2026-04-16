import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICampaignRepository } from '../repositories/i-campaign.repository'

export interface ArchiveCampaignRequest {
  campaignId: string
}

export interface ArchiveCampaignResponse {
  success: true
}

export type ArchiveCampaignResult = Either<Error, ArchiveCampaignResponse>

@Injectable()
export class ArchiveCampaignUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository) {}

  async execute(req: ArchiveCampaignRequest): Promise<ArchiveCampaignResult> {
    const campaign = await this.campaignRepo.findById(req.campaignId)
    if (!campaign) {
      return left(new Error(`Campaign not found: ${req.campaignId}`))
    }

    campaign.archive()
    await this.campaignRepo.save(campaign)

    return right({ success: true })
  }
}
