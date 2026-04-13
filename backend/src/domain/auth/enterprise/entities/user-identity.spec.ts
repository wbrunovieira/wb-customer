import { describe, it, expect } from 'vitest'
import { UserIdentity } from './user-identity'
import { Email } from '../value-objects/email.vo'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { AggregateRoot } from '@/core/aggregate-root'
import { UserCreatedEvent } from '../events/user-created.event'

const makeEmail = () => Email.createUnsafe('user@example.com')

describe('UserIdentity', () => {
  describe('create()', () => {
    it('should create a new UserIdentity with auto-generated id', () => {
      const identity = UserIdentity.create({
        email: makeEmail(),
        passwordHash: 'hashed-password',
      })
      expect(identity.id).toBeInstanceOf(UniqueEntityID)
    })

    it('should set email and passwordHash', () => {
      const email = makeEmail()
      const identity = UserIdentity.create({ email, passwordHash: 'hash' })
      expect(identity.email.value).toBe('user@example.com')
      expect(identity.passwordHash).toBe('hash')
    })

    it('should set createdAt and updatedAt on creation', () => {
      const before = new Date()
      const identity = UserIdentity.create({
        email: makeEmail(),
        passwordHash: 'hash',
      })
      const after = new Date()
      expect(identity.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(identity.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
      expect(identity.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })

    it('should have deletedAt as null by default', () => {
      const identity = UserIdentity.create({
        email: makeEmail(),
        passwordHash: 'hash',
      })
      expect(identity.deletedAt).toBeNull()
      expect(identity.isDeleted).toBe(false)
    })

    it('should add a UserCreatedEvent when creating a new identity', () => {
      const identity = UserIdentity.create({
        email: makeEmail(),
        passwordHash: 'hash',
      })
      expect(identity.domainEvents).toHaveLength(1)
      expect(identity.domainEvents[0]).toBeInstanceOf(UserCreatedEvent)
    })

    it('should NOT add UserCreatedEvent when restoring with an existing id', () => {
      const id = new UniqueEntityID('existing-id')
      const identity = UserIdentity.create(
        { email: makeEmail(), passwordHash: 'hash' },
        id,
      )
      expect(identity.domainEvents).toHaveLength(0)
    })

    it('should be an instance of AggregateRoot', () => {
      const identity = UserIdentity.create({
        email: makeEmail(),
        passwordHash: 'hash',
      })
      expect(identity).toBeInstanceOf(AggregateRoot)
    })
  })

  describe('restore()', () => {
    it('should restore with given id and no domain events', () => {
      const id = new UniqueEntityID('restored-id')
      const identity = UserIdentity.restore(
        {
          email: makeEmail(),
          passwordHash: 'stored-hash',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        id,
      )
      expect(identity.id.value).toBe('restored-id')
      expect(identity.domainEvents).toHaveLength(0)
    })
  })

  describe('updatePassword()', () => {
    it('should update the password hash and updatedAt', () => {
      const identity = UserIdentity.create({
        email: makeEmail(),
        passwordHash: 'old-hash',
      })
      const before = identity.updatedAt

      identity.updatePassword('new-hash')

      expect(identity.passwordHash).toBe('new-hash')
      expect(identity.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })
  })

  describe('softDelete()', () => {
    it('should set deletedAt and mark as deleted', () => {
      const identity = UserIdentity.create({
        email: makeEmail(),
        passwordHash: 'hash',
      })
      expect(identity.isDeleted).toBe(false)

      identity.softDelete()

      expect(identity.isDeleted).toBe(true)
      expect(identity.deletedAt).not.toBeNull()
    })
  })
})
