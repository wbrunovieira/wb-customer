import { describe, it, expect, beforeEach } from 'vitest'
import { DeleteCreativeStrategyUseCase } from './delete-creative-strategy.use-case'
import { InMemoryCreativeStrategyRepository } from './_test/in-memory-creative-strategy.repository'
import { makeStrategy } from './_test/factories'

let repo: InMemoryCreativeStrategyRepository
let sut: DeleteCreativeStrategyUseCase

beforeEach(() => {
  repo = new InMemoryCreativeStrategyRepository()
  sut = new DeleteCreativeStrategyUseCase(repo)
})

describe('DeleteCreativeStrategyUseCase', () => {
  it('should delete the strategy', async () => {
    const strategy = makeStrategy({ customerId: 'cust-1' })
    await repo.save(strategy)

    const result = await sut.execute({ customerId: 'cust-1', strategyId: strategy.id.value })

    expect(result.isRight()).toBe(true)
    expect(repo.items).toHaveLength(0)
  })

  it('should return error when strategy does not exist', async () => {
    const result = await sut.execute({ customerId: 'cust-1', strategyId: 'ghost' })
    expect(result.isLeft()).toBe(true)
  })

  it('should return error when strategy belongs to another customer', async () => {
    const strategy = makeStrategy({ customerId: 'other' })
    await repo.save(strategy)

    const result = await sut.execute({ customerId: 'cust-1', strategyId: strategy.id.value })
    expect(result.isLeft()).toBe(true)
  })
})
