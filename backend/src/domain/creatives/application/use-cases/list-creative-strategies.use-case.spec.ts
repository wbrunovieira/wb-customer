import { describe, it, expect, beforeEach } from 'vitest'
import { ListCreativeStrategiesUseCase } from './list-creative-strategies.use-case'
import { InMemoryCreativeStrategyRepository } from './_test/in-memory-creative-strategy.repository'
import { makeStrategy } from './_test/factories'

let repo: InMemoryCreativeStrategyRepository
let sut: ListCreativeStrategiesUseCase

beforeEach(() => {
  repo = new InMemoryCreativeStrategyRepository()
  sut = new ListCreativeStrategiesUseCase(repo)
})

describe('ListCreativeStrategiesUseCase', () => {
  it('should return all strategies for a customer', async () => {
    await repo.save(makeStrategy({ customerId: 'cust-1', phase: 'exploration' }))
    await repo.save(makeStrategy({ customerId: 'cust-1', phase: 'refinement' }))
    await repo.save(makeStrategy({ customerId: 'cust-2', phase: 'exploration' }))

    const result = await sut.execute({ customerId: 'cust-1' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(2)
      expect(result.value.total).toBe(2)
    }
  })

  it('should filter by phase', async () => {
    await repo.save(makeStrategy({ customerId: 'cust-1', phase: 'exploration' }))
    await repo.save(makeStrategy({ customerId: 'cust-1', phase: 'refinement' }))

    const result = await sut.execute({ customerId: 'cust-1', phase: 'exploration' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(1)
      expect(result.value.items[0].phase).toBe('exploration')
    }
  })

  it('should filter by status', async () => {
    await repo.save(makeStrategy({ customerId: 'cust-1', status: 'active' }))
    await repo.save(makeStrategy({ customerId: 'cust-1', status: 'completed' }))

    const result = await sut.execute({ customerId: 'cust-1', status: 'completed' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(1)
      expect(result.value.items[0].status).toBe('completed')
    }
  })

  it('should return empty when customer has no strategies', async () => {
    const result = await sut.execute({ customerId: 'empty' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(0)
      expect(result.value.total).toBe(0)
    }
  })
})
