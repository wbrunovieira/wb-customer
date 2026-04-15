import { describe, it, expect, beforeEach } from 'vitest'
import { StartTimeTrackingUseCase } from './start-time-tracking.use-case'
import { InMemoryTimeEntryRepository } from '@/test/repositories/tasks/in-memory-time-entry.repository'
import { InMemoryTaskRepository } from '@/test/repositories/tasks/in-memory-task.repository'
import { Task } from '../../enterprise/entities/task'
import { TaskStatus } from '../../enterprise/value-objects/task-status.vo'
import { RecurrenceType } from '../../enterprise/value-objects/recurrence-type.vo'
import { TimeEntry } from '../../enterprise/entities/time-entry'
import { UniqueEntityID } from '@/core/unique-entity-id'

function makeTask(id = 't1'): Task {
  return Task.restore(
    {
      customerId: 'c1',
      title: 'Task',
      status: TaskStatus.createUnsafe('in_progress'),
      ownerUserId: 'u1',
      trackedSeconds: 0,
      progress: 0,
      boardPosition: 0,
      recurrenceType: RecurrenceType.createUnsafe('none'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    new UniqueEntityID(id),
  )
}

let timeEntryRepo: InMemoryTimeEntryRepository
let taskRepo: InMemoryTaskRepository
let sut: StartTimeTrackingUseCase

beforeEach(() => {
  timeEntryRepo = new InMemoryTimeEntryRepository()
  taskRepo = new InMemoryTaskRepository()
  sut = new StartTimeTrackingUseCase(timeEntryRepo, taskRepo)
  taskRepo.items = [makeTask()]
})

describe('StartTimeTrackingUseCase', () => {
  it('should create a new running time entry', async () => {
    const result = await sut.execute({ taskId: 't1', userId: 'u1' })

    expect(result.isRight()).toBe(true)
    expect(timeEntryRepo.items).toHaveLength(1)
    expect(timeEntryRepo.items[0].isRunning).toBe(true)
    expect(timeEntryRepo.items[0].taskId).toBe('t1')
    expect(timeEntryRepo.items[0].userId).toBe('u1')
  })

  it('should stop an existing active entry before creating a new one', async () => {
    // pre-existing active entry
    const existing = TimeEntry.create({ taskId: 't1', userId: 'u1' })
    timeEntryRepo.items = [existing]

    const result = await sut.execute({ taskId: 't1', userId: 'u1' })

    expect(result.isRight()).toBe(true)
    // old entry stopped, new one created
    expect(timeEntryRepo.items).toHaveLength(2)
    const stopped = timeEntryRepo.items.find((e) => e.id.value === existing.id.value)!
    expect(stopped.isRunning).toBe(false)
    const active = timeEntryRepo.items.find((e) => e.id.value !== existing.id.value)!
    expect(active.isRunning).toBe(true)
  })

  it('should accumulate trackedSeconds on task when stopping an existing entry', async () => {
    const past = new Date(Date.now() - 60_000)
    const existing = TimeEntry.restore(
      { taskId: 't1', userId: 'u1', startedAt: past, stoppedAt: null, durationSecs: null, createdAt: past },
      new UniqueEntityID('old'),
    )
    timeEntryRepo.items = [existing]

    await sut.execute({ taskId: 't1', userId: 'u1' })

    const task = taskRepo.items[0]
    expect(task.trackedSeconds).toBeGreaterThanOrEqual(59)
  })
})
