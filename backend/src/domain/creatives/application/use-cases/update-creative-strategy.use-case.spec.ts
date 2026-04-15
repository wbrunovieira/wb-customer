import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateCreativeStrategyUseCase } from './update-creative-strategy.use-case'
import { InMemoryCreativeStrategyRepository } from './_test/in-memory-creative-strategy.repository'
import { makeStrategy } from './_test/factories'

let repo: InMemoryCreativeStrategyRepository
let sut: UpdateCreativeStrategyUseCase

beforeEach(() => {
  repo = new InMemoryCreativeStrategyRepository()
  sut = new UpdateCreativeStrategyUseCase(repo)
})

describe('UpdateCreativeStrategyUseCase', () => {
  it('should update strategy name and budget', async () => {
    const strategy = makeStrategy({ customerId: 'cust-1', name: 'Old' })
    await repo.save(strategy)

    const result = await sut.execute({
      customerId: 'cust-1',
      strategyId: strategy.id.value,
      name: 'New Name',
      budget: 1000,
    })

    expect(result.isRight()).toBe(true)
    const updated = await repo.findById(strategy.id.value)
    expect(updated?.name).toBe('New Name')
    expect(updated?.budget).toBe(1000)
  })

  it('should set a winner creative', async () => {
    const strategy = makeStrategy({ customerId: 'cust-1' })
    await repo.save(strategy)

    await sut.execute({
      customerId: 'cust-1',
      strategyId: strategy.id.value,
      winnerId: 'creative-champ',
    })

    const updated = await repo.findById(strategy.id.value)
    expect(updated?.winnerId).toBe('creative-champ')
  })

  it('should complete a strategy', async () => {
    const strategy = makeStrategy({ customerId: 'cust-1' })
    await repo.save(strategy)

    await sut.execute({
      customerId: 'cust-1',
      strategyId: strategy.id.value,
      status: 'completed',
    })

    const updated = await repo.findById(strategy.id.value)
    expect(updated?.status).toBe('completed')
  })

  it('should return error when strategy does not exist', async () => {
    const result = await sut.execute({
      customerId: 'cust-1',
      strategyId: 'ghost',
      name: 'X',
    })
    expect(result.isLeft()).toBe(true)
  })

  it('should return error when strategy belongs to another customer', async () => {
    const strategy = makeStrategy({ customerId: 'other' })
    await repo.save(strategy)

    const result = await sut.execute({
      customerId: 'cust-1',
      strategyId: strategy.id.value,
      name: 'Hack',
    })
    expect(result.isLeft()).toBe(true)
  })
})
