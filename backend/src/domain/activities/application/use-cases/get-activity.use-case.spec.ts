import { describe, it, expect, beforeEach } from 'vitest'
import { GetActivityUseCase } from './get-activity.use-case'
import { InMemoryActivityRepository } from '@/test/repositories/activities/in-memory-activity.repository'
import { Activity } from '../../enterprise/entities/activity'
import { UniqueEntityID } from '@/core/unique-entity-id'

let repo: InMemoryActivityRepository
let sut: GetActivityUseCase

beforeEach(() => {
  repo = new InMemoryActivityRepository()
  sut = new GetActivityUseCase(repo)
})

describe('GetActivityUseCase', () => {
  it('should return activity when found', async () => {
    const activity = Activity.create({ customerId: 'c1', type: 'email', createdByUserId: 'u1' }, new UniqueEntityID('act-1'))
    await repo.save(activity)

    const result = await sut.execute('act-1')
    expect(result.isRight()).toBe(true)
    if (result.isRight()) expect(result.value.activity.type).toBe('email')
  })

  it('should return error when not found', async () => {
    const result = await sut.execute('nonexistent')
    expect(result.isLeft()).toBe(true)
  })
})
