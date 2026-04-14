import { describe, it, expect } from 'vitest'
import { Sprint } from './sprint'
import { UniqueEntityID } from '@/core/unique-entity-id'

describe('Sprint entity', () => {
  describe('create()', () => {
    it('should create a sprint with the given properties', () => {
      const sprint = Sprint.create({
        customerId: 'customer-1',
        name: 'Sprint 1',
        startAt: new Date('2026-04-01'),
        endAt: new Date('2026-04-14'),
      })

      expect(sprint.name).toBe('Sprint 1')
      expect(sprint.customerId).toBe('customer-1')
      expect(sprint.startAt).toEqual(new Date('2026-04-01'))
      expect(sprint.endAt).toEqual(new Date('2026-04-14'))
      expect(sprint.createdAt).toBeInstanceOf(Date)
    })

    it('should generate a unique id', () => {
      const a = Sprint.create({ customerId: 'c1', name: 'S1', startAt: new Date(), endAt: new Date() })
      const b = Sprint.create({ customerId: 'c1', name: 'S2', startAt: new Date(), endAt: new Date() })

      expect(a.id.value).not.toBe(b.id.value)
    })

    it('should restore with given id', () => {
      const id = new UniqueEntityID('fixed-id')
      const sprint = Sprint.restore(
        {
          customerId: 'c1',
          name: 'Sprint',
          startAt: new Date('2026-04-01'),
          endAt: new Date('2026-04-14'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        id,
      )

      expect(sprint.id.value).toBe('fixed-id')
    })
  })

  describe('update()', () => {
    it('should update name', () => {
      const sprint = Sprint.create({
        customerId: 'c1',
        name: 'Old Name',
        startAt: new Date('2026-04-01'),
        endAt: new Date('2026-04-14'),
      })

      sprint.update({ name: 'New Name' })

      expect(sprint.name).toBe('New Name')
    })

    it('should update dates', () => {
      const sprint = Sprint.create({
        customerId: 'c1',
        name: 'Sprint',
        startAt: new Date('2026-04-01'),
        endAt: new Date('2026-04-14'),
      })
      const newEnd = new Date('2026-04-21')

      sprint.update({ endAt: newEnd })

      expect(sprint.endAt).toEqual(newEnd)
      expect(sprint.startAt).toEqual(new Date('2026-04-01'))
    })

    it('should not change unmentioned fields', () => {
      const sprint = Sprint.create({
        customerId: 'c1',
        name: 'Sprint',
        startAt: new Date('2026-04-01'),
        endAt: new Date('2026-04-14'),
      })

      sprint.update({ name: 'Updated' })

      expect(sprint.customerId).toBe('c1')
    })
  })
})
