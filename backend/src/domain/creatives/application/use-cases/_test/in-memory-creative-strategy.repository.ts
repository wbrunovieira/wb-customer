import {
  ICreativeStrategyRepository,
  FindManyStrategiesParams,
  PaginatedStrategies,
} from '../../../application/repositories/i-creative-strategy.repository'
import { CreativeStrategy } from '../../../enterprise/entities/creative-strategy'

export class InMemoryCreativeStrategyRepository implements ICreativeStrategyRepository {
  public items: CreativeStrategy[] = []

  async findById(id: string): Promise<CreativeStrategy | null> {
    return this.items.find((s) => s.id.value === id) ?? null
  }

  async findByCustomerId(
    customerId: string,
    params: FindManyStrategiesParams = {},
  ): Promise<PaginatedStrategies> {
    const { phase, status, page = 1, limit = 20 } = params

    let filtered = this.items.filter((s) => s.customerId === customerId)
    if (phase) filtered = filtered.filter((s) => s.phase === phase)
    if (status) filtered = filtered.filter((s) => s.status === status)

    const total = filtered.length
    const items = filtered.slice((page - 1) * limit, page * limit)

    return { items, total }
  }

  async save(strategy: CreativeStrategy): Promise<void> {
    const idx = this.items.findIndex((s) => s.id.value === strategy.id.value)
    if (idx >= 0) {
      this.items[idx] = strategy
    } else {
      this.items.push(strategy)
    }
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((s) => s.id.value !== id)
  }
}
