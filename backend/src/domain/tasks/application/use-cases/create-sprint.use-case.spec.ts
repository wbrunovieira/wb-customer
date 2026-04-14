import { describe, it, expect, beforeEach } from 'vitest'
import { CreateSprintUseCase } from './create-sprint.use-case'
import { InMemorySprintRepository } from '@/test/repositories/tasks/in-memory-sprint.repository'

let sprintRepo: InMemorySprintRepository
let sut: CreateSprintUseCase

beforeEach(() => {
  sprintRepo = new InMemorySprintRepository()
  sut = new CreateSprintUseCase(sprintRepo)
})

describe('CreateSprintUseCase', () => {
  it('should create a sprint', async () => {
    const result = await sut.execute({
      customerId: 'customer-1',
      name: 'Sprint 1',
      startAt: new Date('2026-04-01'),
      endAt: new Date('2026-04-14'),
    })
    expect(result.isRight()).toBe(true)
    expect(sprintRepo.items).toHaveLength(1)
    expect(sprintRepo.items[0].name).toBe('Sprint 1')
  })
})
