import { describe, it, expect, beforeEach } from 'vitest'
import { DeleteActivityUseCase } from './delete-activity.use-case'
import { InMemoryActivityRepository } from '@/test/repositories/activities/in-memory-activity.repository'
import { Activity } from '../../enterprise/entities/activity'
import { UniqueEntityID } from '@/core/unique-entity-id'

let repo: InMemoryActivityRepository
let sut: DeleteActivityUseCase

beforeEach(() => {
  repo = new InMemoryActivityRepository()
  sut = new DeleteActivityUseCase(repo)
})

describe('DeleteActivityUseCase', () => {
  it('should soft delete an activity', async () => {
    const activity = Activity.create({ customerId: 'c1', type: 'note', createdByUserId: 'u1' }, new UniqueEntityID('act-1'))
    await repo.save(activity)

    const result = await sut.execute('act-1')
    expect(result.isRight()).toBe(true)
    // soft deleted — findById returns null
    const found = await repo.findById('act-1')
    expect(found).toBeNull()
  })

  it('should return error when activity not found', async () => {
    const result = await sut.execute('nonexistent')
    expect(result.isLeft()).toBe(true)
  })
})
