import { describe, it, expect, beforeEach } from 'vitest'
import { CreateTaskUseCase } from './create-task.use-case'
import { InMemoryTaskRepository } from '@/test/repositories/tasks/in-memory-task.repository'
import { InMemoryTaskActivityLogRepository } from '@/test/repositories/tasks/in-memory-task-activity-log.repository'

let taskRepo: InMemoryTaskRepository
let logRepo: InMemoryTaskActivityLogRepository
let sut: CreateTaskUseCase

beforeEach(() => {
  taskRepo = new InMemoryTaskRepository()
  logRepo = new InMemoryTaskActivityLogRepository()
  sut = new CreateTaskUseCase(taskRepo, logRepo)
})

describe('CreateTaskUseCase', () => {
  it('should create a task with default status backlog', async () => {
    const result = await sut.execute({
      customerId: 'c1', title: 'Fix bug', ownerUserId: 'u1',
    })
    expect(result.isRight()).toBe(true)
    expect(taskRepo.items).toHaveLength(1)
    expect(taskRepo.items[0].status.value).toBe('backlog')
  })

  it('should allow creating an idea task', async () => {
    const result = await sut.execute({
      customerId: 'c1', title: 'New idea', ownerUserId: 'u1', status: 'idea_could',
    })
    expect(result.isRight()).toBe(true)
    expect(taskRepo.items[0].status.isIdea()).toBe(true)
  })

  it('should log a "created" activity', async () => {
    await sut.execute({ customerId: 'c1', title: 'Task', ownerUserId: 'u1' })
    expect(logRepo.items).toHaveLength(1)
    expect(logRepo.items[0].action).toBe('created')
  })
})
