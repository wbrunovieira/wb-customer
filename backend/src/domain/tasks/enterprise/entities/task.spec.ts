import { describe, it, expect } from 'vitest'
import { Task } from './task'
import { TaskStatus } from '../value-objects/task-status.vo'
import { RecurrenceType } from '../value-objects/recurrence-type.vo'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { TaskCreatedEvent } from '../events/task-created.event'
import { TaskStatusChangedEvent } from '../events/task-status-changed.event'

function makeTask(overrides: Partial<Parameters<typeof Task.create>[0]> = {}) {
  return Task.create({
    customerId: 'customer-1',
    title: 'Fix login bug',
    status: TaskStatus.createUnsafe('backlog'),
    ownerUserId: 'user-1',
    recurrenceType: RecurrenceType.createUnsafe('none'),
    ...overrides,
  })
}

describe('Task entity', () => {
  describe('create()', () => {
    it('should create a task with default values', () => {
      const task = makeTask()

      expect(task.title).toBe('Fix login bug')
      expect(task.customerId).toBe('customer-1')
      expect(task.status.value).toBe('backlog')
      expect(task.trackedSeconds).toBe(0)
      expect(task.progress).toBe(0)
      expect(task.boardPosition).toBe(0)
      expect(task.deletedAt).toBeNull()
    })

    it('should emit TaskCreatedEvent on creation', () => {
      const task = makeTask()
      const events = task.domainEvents

      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(TaskCreatedEvent)
    })

    it('should not emit TaskCreatedEvent when restored', () => {
      const id = new UniqueEntityID()
      const task = Task.restore(
        {
          customerId: 'c1',
          title: 'T',
          status: TaskStatus.createUnsafe('backlog'),
          ownerUserId: 'u1',
          recurrenceType: RecurrenceType.createUnsafe('none'),
          trackedSeconds: 0,
          progress: 0,
          boardPosition: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        id,
      )
      expect(task.domainEvents).toHaveLength(0)
    })
  })

  describe('iceScore', () => {
    it('should return null when any ICE field is missing', () => {
      const task = makeTask({ impact: 5, confidence: 8 })
      expect(task.iceScore).toBeNull()
    })

    it('should return null when effort is zero', () => {
      const task = makeTask({ impact: 5, confidence: 8, effort: 0 })
      expect(task.iceScore).toBeNull()
    })

    it('should compute ICE score correctly', () => {
      const task = makeTask({ impact: 10, confidence: 8, effort: 4 })
      expect(task.iceScore).toBe(20) // (10 * 8) / 4
    })
  })

  describe('changeStatus()', () => {
    it('should update status and emit TaskStatusChangedEvent', () => {
      const task = makeTask()
      task.clearEvents()

      task.changeStatus(TaskStatus.createUnsafe('in_progress'))

      expect(task.status.value).toBe('in_progress')
      expect(task.domainEvents).toHaveLength(1)
      expect(task.domainEvents[0]).toBeInstanceOf(TaskStatusChangedEvent)
    })
  })

  describe('recalculateProgress()', () => {
    it('should set progress to 0 when no items', () => {
      const task = makeTask()
      task.recalculateProgress(0, 0)
      expect(task.progress).toBe(0)
    })

    it('should calculate percentage correctly', () => {
      const task = makeTask()
      task.recalculateProgress(3, 4)
      expect(task.progress).toBe(75)
    })

    it('should round progress to nearest integer', () => {
      const task = makeTask()
      task.recalculateProgress(1, 3)
      expect(task.progress).toBe(33)
    })
  })

  describe('update()', () => {
    it('should update only provided fields', () => {
      const task = makeTask()
      const originalTitle = task.title

      task.update({ description: 'Updated description' })

      expect(task.title).toBe(originalTitle)
      expect(task.description).toBe('Updated description')
    })
  })

  describe('softDelete()', () => {
    it('should set deletedAt', () => {
      const task = makeTask()
      expect(task.deletedAt).toBeNull()

      task.softDelete()

      expect(task.deletedAt).toBeInstanceOf(Date)
    })
  })
})
