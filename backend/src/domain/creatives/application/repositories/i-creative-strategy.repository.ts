import { CreativeStrategy, StrategyPhase, StrategyStatus } from '../../enterprise/entities/creative-strategy'

export interface FindManyStrategiesParams {
  phase?: StrategyPhase
  status?: StrategyStatus
  page?: number
  limit?: number
}

export interface PaginatedStrategies {
  items: CreativeStrategy[]
  total: number
}

export abstract class ICreativeStrategyRepository {
  abstract findById(id: string): Promise<CreativeStrategy | null>
  abstract findByCustomerId(
    customerId: string,
    params?: FindManyStrategiesParams,
  ): Promise<PaginatedStrategies>
  abstract save(strategy: CreativeStrategy): Promise<void>
  abstract delete(id: string): Promise<void>
}
