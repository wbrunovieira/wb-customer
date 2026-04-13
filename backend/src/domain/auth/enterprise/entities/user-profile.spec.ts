import { describe, it, expect } from 'vitest'
import { UserProfile } from './user-profile'
import { UniqueEntityID } from '@/core/unique-entity-id'

describe('UserProfile', () => {
  describe('create()', () => {
    it('should create a profile with required fields', () => {
      const profile = UserProfile.create({
        userId: 'user-id-1',
        name: 'Bruno Vieira',
      })
      expect(profile.userId).toBe('user-id-1')
      expect(profile.name).toBe('Bruno Vieira')
    })

    it('should default phone and avatarUrl to null', () => {
      const profile = UserProfile.create({
        userId: 'user-id-1',
        name: 'Bruno',
      })
      expect(profile.phone).toBeNull()
      expect(profile.avatarUrl).toBeNull()
    })

    it('should accept optional phone and avatarUrl', () => {
      const profile = UserProfile.create({
        userId: 'user-id-1',
        name: 'Bruno',
        phone: '+5511999999999',
        avatarUrl: 'https://example.com/avatar.jpg',
      })
      expect(profile.phone).toBe('+5511999999999')
      expect(profile.avatarUrl).toBe('https://example.com/avatar.jpg')
    })

    it('should set createdAt and updatedAt', () => {
      const before = new Date()
      const profile = UserProfile.create({ userId: 'uid', name: 'Test' })
      const after = new Date()
      expect(profile.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(profile.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('update()', () => {
    it('should update name', () => {
      const profile = UserProfile.create({ userId: 'uid', name: 'Old Name' })
      profile.update({ name: 'New Name' })
      expect(profile.name).toBe('New Name')
    })

    it('should update phone to null', () => {
      const profile = UserProfile.create({
        userId: 'uid',
        name: 'Test',
        phone: '+5511999999999',
      })
      profile.update({ phone: null })
      expect(profile.phone).toBeNull()
    })

    it('should update avatarUrl', () => {
      const profile = UserProfile.create({ userId: 'uid', name: 'Test' })
      profile.update({ avatarUrl: 'https://new-url.com/pic.jpg' })
      expect(profile.avatarUrl).toBe('https://new-url.com/pic.jpg')
    })

    it('should update updatedAt on update', () => {
      const profile = UserProfile.create({ userId: 'uid', name: 'Test' })
      const originalUpdatedAt = profile.updatedAt
      profile.update({ name: 'Updated' })
      expect(profile.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime(),
      )
    })

    it('should not change fields that are not provided', () => {
      const profile = UserProfile.create({
        userId: 'uid',
        name: 'Original',
        phone: '+1234567890',
      })
      profile.update({ name: 'Changed' })
      expect(profile.phone).toBe('+1234567890')
    })
  })

  describe('restore()', () => {
    it('should restore with given id', () => {
      const id = new UniqueEntityID('profile-id')
      const profile = UserProfile.restore(
        {
          userId: 'user-id',
          name: 'Restored',
          phone: null,
          avatarUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        id,
      )
      expect(profile.id.value).toBe('profile-id')
      expect(profile.name).toBe('Restored')
    })
  })
})
