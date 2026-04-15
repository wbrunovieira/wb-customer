import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICreativeStrategyRepository } from '../repositories/i-creative-strategy.repository'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { CreativeStrategy, StrategyPhase } from '../../enterprise/entities/creative-strategy'
import { CampaignObjective } from '../../enterprise/entities/creative'
import { CreativeStrategyNotFoundError } from '../../domain/exceptions/creative-strategy-not-found.error'

export interface CreateCreativeStrategyRequest {
  customerId: string
  name: string
  phase: string
  objective?: string
  budget?: number
  durationDays?: number
  startAt?: Date
  parentStrategyId?: string
  creativeIds: string[]
  notes?: string
  createdByUserId: string
}

export interface CreateCreativeStrategyResponse {
  strategyId: string
}

export type CreateCreativeStrategyResult = Either<Error, CreateCreativeStrategyResponse>

@Injectable()
export class CreateCreativeStrategyUseCase {
  constructor(
    private readonly strategyRepo: ICreativeStrategyRepository,
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async execute(req: CreateCreativeStrategyRequest): Promise<CreateCreativeStrategyResult> {
    const customer = await this.customerRepo.findById(req.customerId)
    if (!customer) {
      return left(new CreativeStrategyNotFoundError(req.customerId))
    }

    const strategy = CreativeStrategy.create({
      customerId: req.customerId,
      name: req.name,
      phase: req.phase as StrategyPhase,
      objective: (req.objective as CampaignObjective) ?? null,
      budget: req.budget ?? null,
      durationDays: req.durationDays ?? null,
      startAt: req.startAt ?? null,
      parentStrategyId: req.parentStrategyId ?? null,
      notes: req.notes ?? null,
      items: req.creativeIds.map((id, idx) => ({ creativeId: id, position: idx })),
      createdByUserId: req.createdByUserId,
    })

    await this.strategyRepo.save(strategy)

    return right({ strategyId: strategy.id.value })
  }
}
