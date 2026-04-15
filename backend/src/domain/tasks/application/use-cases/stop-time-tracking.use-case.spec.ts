import { describe, it, expect, beforeEach } from 'vitest'
import { StopTimeTrackingUseCase } from './stop-time-tracking.use-case'
import { InMemoryTimeEntryRepository } from '@/test/repositories/tasks/in-memory-time-entry.repository'
import { InMemoryTaskRepository } from '@/test/repositories/tasks/in-memory-task.repository'
import { Task } from '../../enterprise/entities/task'
import { TaskStatus } from '../../enterprise/value-objects/task-status.vo'
import { RecurrenceType } from '../../enterprise/value-objects/recurrence-type.vo'
import { TimeEntry } from '../../enterprise/entities/time-entry'
import { UniqueEntityID } from '@/core/unique-entity-id'

function makeTask(id = 't1', trackedSeconds = 0): Task {
  return Task.restore(
    {
      customerId: 'c1',
      title: 'Task',
      status: TaskStatus.createUnsafe('in_progress'),
      ownerUserId: 'u1',
      trackedSeconds,
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
let sut: StopTimeTrackingUseCase

beforeEach(() => {
  timeEntryRepo = new InMemoryTimeEntryRepository()
  taskRepo = new InMemoryTaskRepository()
  sut = new StopTimeTrackingUseCase(timeEntryRepo, taskRepo)
})

describe('StopTimeTrackingUseCase', () => {
  it('should return null durationSecs if no active entry', async () => {
    const result = await sut.execute({ taskId: 't1', userId: 'u1' })
    expect(result.isRight()).toBe(true)
    expect(result.value.durationSecs).toBeNull()
  })

  it('should stop the active entry and return duration', async () => {
    taskRepo.items = [makeTask()]
    const past = new Date(Date.now() - 30_000)
    const entry = TimeEntry.restore(
      { taskId: 't1', userId: 'u1', startedAt: past, stoppedAt: null, durationSecs: null, createdAt: past },
      new UniqueEntityID('e1'),
    )
    timeEntryRepo.items = [entry]

    const result = await sut.execute({ taskId: 't1', userId: 'u1' })

    expect(result.isRight()).toBe(true)
    expect(result.value.durationSecs).toBeGreaterThanOrEqual(29)
    const stopped = timeEntryRepo.items[0]
    expect(stopped.isRunning).toBe(false)
  })

  it('should add durationSecs to task.trackedSeconds', async () => {
    taskRepo.items = [makeTask('t1', 100)]
    const past = new Date(Date.now() - 60_000)
    const entry = TimeEntry.restore(
      { taskId: 't1', userId: 'u1', startedAt: past, stoppedAt: null, durationSecs: null, createdAt: past },
      new UniqueEntityID('e1'),
    )
    timeEntryRepo.items = [entry]

    await sut.execute({ taskId: 't1', userId: 'u1' })

    const task = taskRepo.items[0]
    expect(task.trackedSeconds).toBeGreaterThanOrEqual(159)
  })
})
