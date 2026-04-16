import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IAdSetRepository } from '../repositories/i-ad-set.repository'
import { AdCampaignStatus } from '../../enterprise/entities/campaign'

export interface UpdateAdSetRequest {
  adSetId: string
  name?: string
  status?: AdCampaignStatus
  dailyBudget?: number | null
  totalBudget?: number | null
  startAt?: Date | null
  endAt?: Date | null
  targeting?: unknown | null
  optimizationGoal?: string | null
  billingEvent?: string | null
}

export interface UpdateAdSetResponse {
  success: true
}

export type UpdateAdSetResult = Either<Error, UpdateAdSetResponse>

@Injectable()
export class UpdateAdSetUseCase {
  constructor(private readonly adSetRepo: IAdSetRepository) {}

  async execute(req: UpdateAdSetRequest): Promise<UpdateAdSetResult> {
    const adSet = await this.adSetRepo.findById(req.adSetId)
    if (!adSet) {
      return left(new Error(`Ad set not found: ${req.adSetId}`))
    }

    adSet.update({
      name: req.name,
      status: req.status,
      dailyBudget: req.dailyBudget,
      totalBudget: req.totalBudget,
      startAt: req.startAt,
      endAt: req.endAt,
      targeting: req.targeting,
      optimizationGoal: req.optimizationGoal,
      billingEvent: req.billingEvent,
    })

    await this.adSetRepo.save(adSet)

    return right({ success: true })
  }
}
