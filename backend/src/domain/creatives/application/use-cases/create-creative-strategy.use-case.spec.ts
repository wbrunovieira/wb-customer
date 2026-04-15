import { describe, it, expect, beforeEach } from 'vitest'
import { CreateCreativeStrategyUseCase } from './create-creative-strategy.use-case'
import { InMemoryCreativeStrategyRepository } from './_test/in-memory-creative-strategy.repository'
import { InMemoryCustomerRepository } from './_test/in-memory-customer.repository'
import { makeCustomer } from './_test/factories'

let strategyRepo: InMemoryCreativeStrategyRepository
let customerRepo: InMemoryCustomerRepository
let sut: CreateCreativeStrategyUseCase

beforeEach(() => {
  strategyRepo = new InMemoryCreativeStrategyRepository()
  customerRepo = new InMemoryCustomerRepository()
  sut = new CreateCreativeStrategyUseCase(strategyRepo, customerRepo)
})

describe('CreateCreativeStrategyUseCase', () => {
  it('should create an exploration strategy (phase A)', async () => {
    const customer = makeCustomer()
    await customerRepo.save(customer)

    const result = await sut.execute({
      customerId: customer.id.value,
      name: 'Exploração Abril',
      phase: 'exploration',
      objective: 'leads',
      budget: 500,
      durationDays: 5,
      creativeIds: ['c-1', 'c-2', 'c-3'],
      createdByUserId: 'user-1',
    })

    expect(result.isRight()).toBe(true)
    const strategy = strategyRepo.items[0]
    expect(strategy.phase).toBe('exploration')
    expect(strategy.budget).toBe(500)
    expect(strategy.durationDays).toBe(5)
    expect(strategy.items).toHaveLength(3)
  })

  it('should create a refinement strategy (phase B) with parentStrategyId', async () => {
    const customer = makeCustomer()
    await customerRepo.save(customer)

    const result = await sut.execute({
      customerId: customer.id.value,
      name: 'Lapidação Campeão',
      phase: 'refinement',
      parentStrategyId: 'strategy-a-1',
      creativeIds: ['c-winner-v1', 'c-winner-v2'],
      createdByUserId: 'user-1',
    })

    expect(result.isRight()).toBe(true)
    const strategy = strategyRepo.items[0]
    expect(strategy.phase).toBe('refinement')
    expect(strategy.parentStrategyId).toBe('strategy-a-1')
  })

  it('should assign positions to creatives in order', async () => {
    const customer = makeCustomer()
    await customerRepo.save(customer)

    await sut.execute({
      customerId: customer.id.value,
      name: 'Test',
      phase: 'exploration',
      creativeIds: ['c-1', 'c-2', 'c-3'],
      createdByUserId: 'user-1',
    })

    const strategy = strategyRepo.items[0]
    expect(strategy.items[0]).toEqual({ creativeId: 'c-1', position: 0 })
    expect(strategy.items[1]).toEqual({ creativeId: 'c-2', position: 1 })
    expect(strategy.items[2]).toEqual({ creativeId: 'c-3', position: 2 })
  })

  it('should return error when customer does not exist', async () => {
    const result = await sut.execute({
      customerId: 'ghost',
      name: 'Test',
      phase: 'exploration',
      creativeIds: [],
      createdByUserId: 'user-1',
    })

    expect(result.isLeft()).toBe(true)
  })

  it('should start with active status', async () => {
    const customer = makeCustomer()
    await customerRepo.save(customer)

    await sut.execute({
      customerId: customer.id.value,
      name: 'Test',
      phase: 'exploration',
      creativeIds: [],
      createdByUserId: 'user-1',
    })

    expect(strategyRepo.items[0].status).toBe('active')
  })
})
