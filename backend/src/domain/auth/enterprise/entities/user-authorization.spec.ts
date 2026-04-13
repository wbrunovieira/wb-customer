import { describe, it, expect } from 'vitest'
import { UserAuthorization } from './user-authorization'
import { UserRole } from '../value-objects/user-role.vo'
import { UniqueEntityID } from '@/core/unique-entity-id'

describe('UserAuthorization', () => {
  describe('create()', () => {
    it('should create with userId and role', () => {
      const role = UserRole.createUnsafe('admin')
      const auth = UserAuthorization.create({ userId: 'user-1', role })
      expect(auth.userId).toBe('user-1')
      expect(auth.role.value).toBe('admin')
    })

    it('should set createdAt and updatedAt', () => {
      const before = new Date()
      const auth = UserAuthorization.create({
        userId: 'uid',
        role: UserRole.createUnsafe('employee'),
      })
      const after = new Date()
      expect(auth.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(auth.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('updateRole()', () => {
    it('should change the role', () => {
      const auth = UserAuthorization.create({
        userId: 'uid',
        role: UserRole.createUnsafe('employee'),
      })
      auth.updateRole(UserRole.createUnsafe('manager'))
      expect(auth.role.value).toBe('manager')
    })

    it('should update updatedAt', () => {
      const auth = UserAuthorization.create({
        userId: 'uid',
        role: UserRole.createUnsafe('employee'),
      })
      const before = auth.updatedAt
      auth.updateRole(UserRole.createUnsafe('admin'))
      expect(auth.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })
  })

  describe('restore()', () => {
    it('should restore with given id', () => {
      const id = new UniqueEntityID('auth-id')
      const auth = UserAuthorization.restore(
        {
          userId: 'user-id',
          role: UserRole.createUnsafe('manager'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        id,
      )
      expect(auth.id.value).toBe('auth-id')
      expect(auth.role.isManager()).toBe(true)
    })
  })
})
