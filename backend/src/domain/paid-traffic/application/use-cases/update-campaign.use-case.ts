import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICampaignRepository } from '../repositories/i-campaign.repository'
import { AD_CAMPAIGN_OBJECTIVES, AdCampaignObjective } from '../../enterprise/entities/campaign'

export interface UpdateCampaignRequest {
  campaignId: string
  name?: string
  objective?: string
  plannedBudget?: number | null
  dailyBudget?: number | null
  startAt?: Date | null
  endAt?: Date | null
  notes?: string | null
}

export interface UpdateCampaignResponse {
  success: true
}

export type UpdateCampaignResult = Either<Error, UpdateCampaignResponse>

@Injectable()
export class UpdateCampaignUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository) {}

  async execute(req: UpdateCampaignRequest): Promise<UpdateCampaignResult> {
    const campaign = await this.campaignRepo.findById(req.campaignId)
    if (!campaign) {
      return left(new Error(`Campaign not found: ${req.campaignId}`))
    }

    if (req.objective !== undefined && !AD_CAMPAIGN_OBJECTIVES.includes(req.objective as AdCampaignObjective)) {
      return left(new Error(`Invalid campaign objective: "${req.objective}"`))
    }

    campaign.update({
      name: req.name,
      objective: req.objective as AdCampaignObjective | undefined,
      plannedBudget: req.plannedBudget,
      dailyBudget: req.dailyBudget,
      startAt: req.startAt,
      endAt: req.endAt,
      notes: req.notes,
    })

    await this.campaignRepo.save(campaign)

    return right({ success: true })
  }
}
