import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICreativeStrategyRepository } from '../repositories/i-creative-strategy.repository'
import { CreativeStrategyNotFoundError } from '../../domain/exceptions/creative-strategy-not-found.error'

export interface DeleteCreativeStrategyRequest {
  customerId: string
  strategyId: string
}

export type DeleteCreativeStrategyResult = Either<CreativeStrategyNotFoundError, void>

@Injectable()
export class DeleteCreativeStrategyUseCase {
  constructor(private readonly repo: ICreativeStrategyRepository) {}

  async execute(req: DeleteCreativeStrategyRequest): Promise<DeleteCreativeStrategyResult> {
    const strategy = await this.repo.findById(req.strategyId)

    if (!strategy || strategy.customerId !== req.customerId) {
      return left(new CreativeStrategyNotFoundError(req.strategyId))
    }

    await this.repo.delete(req.strategyId)

    return right(undefined)
  }
}
