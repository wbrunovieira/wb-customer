import { describe, it, expect, beforeEach } from 'vitest'
import { ListCustomerTasksUseCase } from './list-customer-tasks.use-case'
import { InMemoryTaskRepository } from '@/test/repositories/tasks/in-memory-task.repository'
import { Task } from '../../enterprise/entities/task'
import { TaskStatus } from '../../enterprise/value-objects/task-status.vo'
import { RecurrenceType } from '../../enterprise/value-objects/recurrence-type.vo'

let taskRepo: InMemoryTaskRepository
let sut: ListCustomerTasksUseCase

function makeTask(customerId: string, status = 'backlog') {
  return Task.create({
    customerId,
    title: 'Task',
    status: TaskStatus.createUnsafe(status),
    ownerUserId: 'u1',
    recurrenceType: RecurrenceType.createUnsafe('none'),
  })
}

beforeEach(() => {
  taskRepo = new InMemoryTaskRepository()
  sut = new ListCustomerTasksUseCase(taskRepo)
})

describe('ListCustomerTasksUseCase', () => {
  it('should list tasks for a customer', async () => {
    taskRepo.items.push(makeTask('c1'), makeTask('c1'), makeTask('c2'))
    const result = await sut.execute({ customerId: 'c1' })
    expect(result.isRight()).toBe(true)
    expect(result.value.items).toHaveLength(2)
  })

  it('should filter by status', async () => {
    taskRepo.items.push(makeTask('c1', 'backlog'), makeTask('c1', 'done'))
    const result = await sut.execute({ customerId: 'c1', status: 'backlog' })
    expect(result.value.items).toHaveLength(1)
  })

  it('should filter ideas only', async () => {
    taskRepo.items.push(makeTask('c1', 'backlog'), makeTask('c1', 'idea_could'))
    const result = await sut.execute({ customerId: 'c1', ideasOnly: true })
    expect(result.value.items).toHaveLength(1)
    expect(result.value.items[0].status.isIdea()).toBe(true)
  })
})
