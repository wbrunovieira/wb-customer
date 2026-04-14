import { describe, it, expect, beforeEach } from 'vitest'
import { ListCustomerActivitiesUseCase } from './list-customer-activities.use-case'
import { InMemoryActivityRepository } from '@/test/repositories/activities/in-memory-activity.repository'
import { Activity } from '../../enterprise/entities/activity'

let repo: InMemoryActivityRepository
let sut: ListCustomerActivitiesUseCase

beforeEach(() => {
  repo = new InMemoryActivityRepository()
  sut = new ListCustomerActivitiesUseCase(repo)
})

describe('ListCustomerActivitiesUseCase', () => {
  it('should list activities for a customer', async () => {
    await repo.save(Activity.create({ customerId: 'c1', type: 'note', createdByUserId: 'u1' }))
    await repo.save(Activity.create({ customerId: 'c1', type: 'email', createdByUserId: 'u1' }))
    await repo.save(Activity.create({ customerId: 'c2', type: 'note', createdByUserId: 'u1' }))

    const result = await sut.execute({ customerId: 'c1' })
    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(2)
      expect(result.value.total).toBe(2)
    }
  })

  it('should filter by type', async () => {
    await repo.save(Activity.create({ customerId: 'c1', type: 'note', createdByUserId: 'u1' }))
    await repo.save(Activity.create({ customerId: 'c1', type: 'email', createdByUserId: 'u1' }))

    const result = await sut.execute({ customerId: 'c1', type: 'note' })
    expect(result.isRight()).toBe(true)
    if (result.isRight()) expect(result.value.items).toHaveLength(1)
  })

  it('should paginate results', async () => {
    for (let i = 0; i < 5; i++) {
      await repo.save(Activity.create({ customerId: 'c1', type: 'note', createdByUserId: 'u1' }))
    }
    const result = await sut.execute({ customerId: 'c1', page: 1, limit: 3 })
    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(3)
      expect(result.value.total).toBe(5)
    }
  })
})
