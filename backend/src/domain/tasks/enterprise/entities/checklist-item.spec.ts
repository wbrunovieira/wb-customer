import { describe, it, expect } from 'vitest'
import { ChecklistItem } from './checklist-item'
import { UniqueEntityID } from '@/core/unique-entity-id'

describe('ChecklistItem entity', () => {
  describe('create()', () => {
    it('should create a checklist item', () => {
      const item = ChecklistItem.create({
        taskId: 'task-1',
        text: 'Write unit tests',
        isDone: false,
        position: 0,
      })

      expect(item.taskId).toBe('task-1')
      expect(item.text).toBe('Write unit tests')
      expect(item.isDone).toBe(false)
      expect(item.position).toBe(0)
      expect(item.createdAt).toBeInstanceOf(Date)
    })

    it('should restore with given id', () => {
      const id = new UniqueEntityID('item-id')
      const item = ChecklistItem.restore(
        {
          taskId: 'task-1',
          text: 'Step 1',
          isDone: true,
          position: 0,
          createdAt: new Date(),
        },
        id,
      )

      expect(item.id.value).toBe('item-id')
      expect(item.isDone).toBe(true)
    })
  })

  describe('toggle()', () => {
    it('should toggle from false to true', () => {
      const item = ChecklistItem.create({ taskId: 't1', text: 'Step', isDone: false, position: 0 })
      item.toggle()
      expect(item.isDone).toBe(true)
    })

    it('should toggle from true to false', () => {
      const item = ChecklistItem.create({ taskId: 't1', text: 'Step', isDone: true, position: 0 })
      item.toggle()
      expect(item.isDone).toBe(false)
    })

    it('should toggle back and forth', () => {
      const item = ChecklistItem.create({ taskId: 't1', text: 'Step', isDone: false, position: 0 })
      item.toggle()
      item.toggle()
      expect(item.isDone).toBe(false)
    })
  })
})
