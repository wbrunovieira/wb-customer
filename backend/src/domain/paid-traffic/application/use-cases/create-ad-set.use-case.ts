import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IAdSetRepository } from '../repositories/i-ad-set.repository'
import { ICampaignRepository } from '../repositories/i-campaign.repository'
import { AdSet } from '../../enterprise/entities/ad-set'

export interface CreateAdSetRequest {
  campaignId: string
  name: string
  dailyBudget?: number | null
  totalBudget?: number | null
  startAt?: Date | null
  endAt?: Date | null
  targeting?: unknown | null
  optimizationGoal?: string | null
  billingEvent?: string | null
}

export interface CreateAdSetResponse {
  adSetId: string
}

export type CreateAdSetResult = Either<Error, CreateAdSetResponse>

@Injectable()
export class CreateAdSetUseCase {
  constructor(
    private readonly adSetRepo: IAdSetRepository,
    private readonly campaignRepo: ICampaignRepository,
  ) {}

  async execute(req: CreateAdSetRequest): Promise<CreateAdSetResult> {
    const campaign = await this.campaignRepo.findById(req.campaignId)
    if (!campaign) {
      return left(new Error(`Campaign not found: ${req.campaignId}`))
    }

    const adSet = AdSet.create({
      campaignId: req.campaignId,
      name: req.name,
      dailyBudget: req.dailyBudget ?? null,
      totalBudget: req.totalBudget ?? null,
      startAt: req.startAt ?? null,
      endAt: req.endAt ?? null,
      targeting: req.targeting ?? null,
      optimizationGoal: req.optimizationGoal ?? null,
      billingEvent: req.billingEvent ?? null,
    })

    await this.adSetRepo.save(adSet)

    return right({ adSetId: adSet.id.value })
  }
}
