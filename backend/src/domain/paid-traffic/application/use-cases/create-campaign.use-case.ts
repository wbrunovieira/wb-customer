import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICampaignRepository } from '../repositories/i-campaign.repository'
import { Campaign, AD_CAMPAIGN_OBJECTIVES, AdCampaignObjective } from '../../enterprise/entities/campaign'

export interface CreateCampaignRequest {
  customerId: string
  name: string
  objective: string
  plannedBudget?: number | null
  dailyBudget?: number | null
  startAt?: Date | null
  endAt?: Date | null
  notes?: string | null
  createdByUserId: string
}

export interface CreateCampaignResponse {
  campaignId: string
}

export type CreateCampaignResult = Either<Error, CreateCampaignResponse>

@Injectable()
export class CreateCampaignUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository) {}

  async execute(req: CreateCampaignRequest): Promise<CreateCampaignResult> {
    if (!AD_CAMPAIGN_OBJECTIVES.includes(req.objective as AdCampaignObjective)) {
      return left(new Error(`Invalid campaign objective: "${req.objective}"`))
    }

    const campaign = Campaign.create({
      customerId: req.customerId,
      name: req.name,
      objective: req.objective as AdCampaignObjective,
      plannedBudget: req.plannedBudget ?? null,
      dailyBudget: req.dailyBudget ?? null,
      startAt: req.startAt ?? null,
      endAt: req.endAt ?? null,
      notes: req.notes ?? null,
      createdByUserId: req.createdByUserId,
    })

    await this.campaignRepo.save(campaign)

    return right({ campaignId: campaign.id.value })
  }
}
