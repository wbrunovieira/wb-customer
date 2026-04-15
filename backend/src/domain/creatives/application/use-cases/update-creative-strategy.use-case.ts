import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICreativeStrategyRepository } from '../repositories/i-creative-strategy.repository'
import { StrategyStatus } from '../../enterprise/entities/creative-strategy'
import { CampaignObjective } from '../../enterprise/entities/creative'
import { CreativeStrategyNotFoundError } from '../../domain/exceptions/creative-strategy-not-found.error'

export interface UpdateCreativeStrategyRequest {
  customerId: string
  strategyId: string
  name?: string
  objective?: CampaignObjective | null
  budget?: number | null
  durationDays?: number | null
  startAt?: Date | null
  endAt?: Date | null
  winnerId?: string
  status?: string
  notes?: string | null
}

export type UpdateCreativeStrategyResult = Either<CreativeStrategyNotFoundError, void>

@Injectable()
export class UpdateCreativeStrategyUseCase {
  constructor(private readonly repo: ICreativeStrategyRepository) {}

  async execute(req: UpdateCreativeStrategyRequest): Promise<UpdateCreativeStrategyResult> {
    const strategy = await this.repo.findById(req.strategyId)

    if (!strategy || strategy.customerId !== req.customerId) {
      return left(new CreativeStrategyNotFoundError(req.strategyId))
    }

    strategy.updateDetails({
      name: req.name,
      objective: req.objective,
      budget: req.budget,
      durationDays: req.durationDays,
      startAt: req.startAt,
      endAt: req.endAt,
      notes: req.notes,
    })

    if (req.winnerId !== undefined) {
      strategy.setWinner(req.winnerId)
    }

    if (req.status !== undefined) {
      const s = req.status as StrategyStatus
      if (s === 'completed') strategy.complete()
      else if (s === 'paused') strategy.pause()
      else if (s === 'active') strategy.activate()
    }

    await this.repo.save(strategy)

    return right(undefined)
  }
}
