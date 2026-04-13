import { describe, it, expect } from 'vitest'
import { MeetingType } from './meeting-type'

describe('MeetingType entity', () => {
  it('should create with defaults', () => {
    const type = MeetingType.create({ name: 'Discovery' })
    expect(type.name).toBe('Discovery')
    expect(type.durationMinutes).toBe(60)
    expect(type.color).toBe('#3B82F6')
    expect(type.isActive).toBe(true)
    expect(type.isDeleted).toBe(false)
  })

  it('should accept custom values', () => {
    const type = MeetingType.create({
      name: 'Short Call',
      durationMinutes: 30,
      color: '#FF0000',
    })
    expect(type.durationMinutes).toBe(30)
    expect(type.color).toBe('#FF0000')
  })

  it('should update fields', () => {
    const type = MeetingType.create({ name: 'Old Name' })
    type.update({ name: 'New Name', durationMinutes: 45 })
    expect(type.name).toBe('New Name')
    expect(type.durationMinutes).toBe(45)
  })

  it('should soft delete', () => {
    const type = MeetingType.create({ name: 'Type A' })
    type.softDelete()
    expect(type.isDeleted).toBe(true)
    expect(type.deletedAt).not.toBeNull()
  })

  it('should deactivate via update', () => {
    const type = MeetingType.create({ name: 'Type B' })
    type.update({ isActive: false })
    expect(type.isActive).toBe(false)
  })
})
