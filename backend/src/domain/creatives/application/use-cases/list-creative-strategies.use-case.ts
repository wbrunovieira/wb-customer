import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ICreativeStrategyRepository } from '../repositories/i-creative-strategy.repository'
import { CreativeStrategy, StrategyPhase, StrategyStatus } from '../../enterprise/entities/creative-strategy'

export interface ListCreativeStrategiesRequest {
  customerId: string
  phase?: string
  status?: string
  page?: number
  limit?: number
}

export interface ListCreativeStrategiesResponse {
  items: CreativeStrategy[]
  total: number
}

export type ListCreativeStrategiesResult = Either<never, ListCreativeStrategiesResponse>

@Injectable()
export class ListCreativeStrategiesUseCase {
  constructor(private readonly repo: ICreativeStrategyRepository) {}

  async execute(req: ListCreativeStrategiesRequest): Promise<ListCreativeStrategiesResult> {
    const { items, total } = await this.repo.findByCustomerId(req.customerId, {
      phase: req.phase as StrategyPhase | undefined,
      status: req.status as StrategyStatus | undefined,
      page: req.page,
      limit: req.limit,
    })

    return right({ items, total })
  }
}
