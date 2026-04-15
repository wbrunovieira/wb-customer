import { describe, it, expect, beforeEach } from 'vitest'
import { GetTaskTimeEntriesUseCase } from './get-task-time-entries.use-case'
import { InMemoryTimeEntryRepository } from '@/test/repositories/tasks/in-memory-time-entry.repository'
import { TimeEntry } from '../../enterprise/entities/time-entry'
import { UniqueEntityID } from '@/core/unique-entity-id'

let timeEntryRepo: InMemoryTimeEntryRepository
let sut: GetTaskTimeEntriesUseCase

beforeEach(() => {
  timeEntryRepo = new InMemoryTimeEntryRepository()
  sut = new GetTaskTimeEntriesUseCase(timeEntryRepo)
})

describe('GetTaskTimeEntriesUseCase', () => {
  it('should return all entries for a task', async () => {
    timeEntryRepo.items = [
      TimeEntry.create({ taskId: 't1', userId: 'u1' }, new UniqueEntityID('e1')),
      TimeEntry.create({ taskId: 't1', userId: 'u2' }, new UniqueEntityID('e2')),
      TimeEntry.create({ taskId: 't2', userId: 'u1' }, new UniqueEntityID('e3')),
    ]

    const result = await sut.execute('t1', 'u1')

    expect(result.isRight()).toBe(true)
    expect(result.value.entries).toHaveLength(2)
  })

  it('should identify the active entry for the requesting user', async () => {
    const active = TimeEntry.create({ taskId: 't1', userId: 'u1' }, new UniqueEntityID('e1'))
    const stopped = TimeEntry.restore(
      {
        taskId: 't1',
        userId: 'u1',
        startedAt: new Date(Date.now() - 60_000),
        stoppedAt: new Date(),
        durationSecs: 60,
        createdAt: new Date(),
      },
      new UniqueEntityID('e2'),
    )
    timeEntryRepo.items = [active, stopped]

    const result = await sut.execute('t1', 'u1')

    expect(result.value.activeEntryId).toBe('e1')
  })

  it('should return null activeEntryId when no running entry', async () => {
    const stopped = TimeEntry.restore(
      {
        taskId: 't1',
        userId: 'u1',
        startedAt: new Date(Date.now() - 60_000),
        stoppedAt: new Date(),
        durationSecs: 60,
        createdAt: new Date(),
      },
      new UniqueEntityID('e1'),
    )
    timeEntryRepo.items = [stopped]

    const result = await sut.execute('t1', 'u1')

    expect(result.value.activeEntryId).toBeNull()
  })
})
