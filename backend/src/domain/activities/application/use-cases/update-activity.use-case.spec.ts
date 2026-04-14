import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateActivityUseCase } from './update-activity.use-case'
import { InMemoryActivityRepository } from '@/test/repositories/activities/in-memory-activity.repository'
import { Activity } from '../../enterprise/entities/activity'
import { UniqueEntityID } from '@/core/unique-entity-id'

let repo: InMemoryActivityRepository
let sut: UpdateActivityUseCase

beforeEach(() => {
  repo = new InMemoryActivityRepository()
  sut = new UpdateActivityUseCase(repo)
})

describe('UpdateActivityUseCase', () => {
  it('should update description and status', async () => {
    const activity = Activity.create({ customerId: 'c1', type: 'note', createdByUserId: 'u1' }, new UniqueEntityID('act-1'))
    await repo.save(activity)

    const result = await sut.execute({ activityId: 'act-1', description: 'Updated', status: 'done' })
    expect(result.isRight()).toBe(true)
    expect(repo.items[0].description).toBe('Updated')
    expect(repo.items[0].status).toBe('done')
  })

  it('should return error when activity not found', async () => {
    const result = await sut.execute({ activityId: 'nonexistent' })
    expect(result.isLeft()).toBe(true)
  })
})
