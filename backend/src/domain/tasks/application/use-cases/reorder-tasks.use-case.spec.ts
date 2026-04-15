import { describe, it, expect, beforeEach } from 'vitest'
import { ReorderTasksUseCase } from './reorder-tasks.use-case'
import { InMemoryTaskRepository } from '@/test/repositories/tasks/in-memory-task.repository'
import { Task } from '../../enterprise/entities/task'
import { TaskStatus } from '../../enterprise/value-objects/task-status.vo'
import { RecurrenceType } from '../../enterprise/value-objects/recurrence-type.vo'
import { UniqueEntityID } from '@/core/unique-entity-id'

function makeTask(id: string, boardPosition: number): Task {
  return Task.restore(
    {
      customerId: 'c1',
      title: `Task ${id}`,
      status: TaskStatus.createUnsafe('backlog'),
      ownerUserId: 'u1',
      trackedSeconds: 0,
      progress: 0,
      boardPosition,
      recurrenceType: RecurrenceType.createUnsafe('none'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    new UniqueEntityID(id),
  )
}

let taskRepo: InMemoryTaskRepository
let sut: ReorderTasksUseCase

beforeEach(() => {
  taskRepo = new InMemoryTaskRepository()
  sut = new ReorderTasksUseCase(taskRepo)
  taskRepo.items = [makeTask('t1', 0), makeTask('t2', 1), makeTask('t3', 2)]
})

describe('ReorderTasksUseCase', () => {
  it('should update board positions based on ordered ids', async () => {
    const result = await sut.execute({ orderedIds: ['t3', 't1', 't2'] })

    expect(result.isRight()).toBe(true)
    const t3 = taskRepo.items.find((t) => t.id.value === 't3')!
    const t1 = taskRepo.items.find((t) => t.id.value === 't1')!
    const t2 = taskRepo.items.find((t) => t.id.value === 't2')!
    expect(t3.boardPosition).toBe(0)
    expect(t1.boardPosition).toBe(1)
    expect(t2.boardPosition).toBe(2)
  })

  it('should handle empty list', async () => {
    const result = await sut.execute({ orderedIds: [] })
    expect(result.isRight()).toBe(true)
  })
})
