import { describe, it, expect } from 'vitest'
import { TaskTag } from './task-tag'
import { UniqueEntityID } from '@/core/unique-entity-id'

describe('TaskTag entity', () => {
  describe('create()', () => {
    it('should create a tag with customer scope', () => {
      const tag = TaskTag.create({
        customerId: 'customer-1',
        name: 'Bug',
        color: '#EF4444',
      })

      expect(tag.name).toBe('Bug')
      expect(tag.color).toBe('#EF4444')
      expect(tag.customerId).toBe('customer-1')
      expect(tag.createdAt).toBeInstanceOf(Date)
    })

    it('should create a global tag (null customerId)', () => {
      const tag = TaskTag.create({
        customerId: null,
        name: 'Feature',
        color: '#3B82F6',
      })

      expect(tag.customerId).toBeNull()
      expect(tag.name).toBe('Feature')
    })

    it('should restore with given id', () => {
      const id = new UniqueEntityID('tag-id')
      const tag = TaskTag.restore(
        {
          customerId: 'c1',
          name: 'Enhancement',
          color: '#10B981',
          createdAt: new Date(),
        },
        id,
      )

      expect(tag.id.value).toBe('tag-id')
    })

    it('should generate unique ids', () => {
      const a = TaskTag.create({ customerId: 'c1', name: 'A', color: '#000' })
      const b = TaskTag.create({ customerId: 'c1', name: 'B', color: '#fff' })

      expect(a.id.value).not.toBe(b.id.value)
    })
  })
})
