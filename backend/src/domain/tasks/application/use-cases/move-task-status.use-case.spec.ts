import { describe, it, expect, beforeEach } from 'vitest'
import { MoveTaskStatusUseCase } from './move-task-status.use-case'
import { InMemoryTaskRepository } from '@/test/repositories/tasks/in-memory-task.repository'
import { InMemoryTaskActivityLogRepository } from '@/test/repositories/tasks/in-memory-task-activity-log.repository'
import { Task } from '../../enterprise/entities/task'
import { TaskStatus } from '../../enterprise/value-objects/task-status.vo'
import { RecurrenceType } from '../../enterprise/value-objects/recurrence-type.vo'

let taskRepo: InMemoryTaskRepository
let logRepo: InMemoryTaskActivityLogRepository
let sut: MoveTaskStatusUseCase

beforeEach(() => {
  taskRepo = new InMemoryTaskRepository()
  logRepo = new InMemoryTaskActivityLogRepository()
  sut = new MoveTaskStatusUseCase(taskRepo, logRepo)
})

describe('MoveTaskStatusUseCase', () => {
  it('should change task status', async () => {
    const task = Task.create({ customerId: 'c1', title: 'T', status: TaskStatus.createUnsafe('backlog'), ownerUserId: 'u1', recurrenceType: RecurrenceType.createUnsafe('none') })
    taskRepo.items.push(task)

    const result = await sut.execute({ taskId: task.id.value, customerId: 'c1', userId: 'u1', status: 'in_progress' })
    expect(result.isRight()).toBe(true)
    expect(taskRepo.items[0].status.value).toBe('in_progress')
  })

  it('should return error for invalid status', async () => {
    const task = Task.create({ customerId: 'c1', title: 'T', status: TaskStatus.createUnsafe('backlog'), ownerUserId: 'u1', recurrenceType: RecurrenceType.createUnsafe('none') })
    taskRepo.items.push(task)

    const result = await sut.execute({ taskId: task.id.value, customerId: 'c1', userId: 'u1', status: 'invalid_status' })
    expect(result.isLeft()).toBe(true)
  })

  it('should log the status change', async () => {
    const task = Task.create({ customerId: 'c1', title: 'T', status: TaskStatus.createUnsafe('backlog'), ownerUserId: 'u1', recurrenceType: RecurrenceType.createUnsafe('none') })
    taskRepo.items.push(task)

    await sut.execute({ taskId: task.id.value, customerId: 'c1', userId: 'u1', status: 'done' })
    expect(logRepo.items[0].action).toBe('status_changed')
    expect(logRepo.items[0].fromValue).toBe('backlog')
    expect(logRepo.items[0].toValue).toBe('done')
  })
})
