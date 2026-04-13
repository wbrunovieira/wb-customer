import { describe, it, expect } from 'vitest'
import { RefreshToken } from './refresh-token'
import { UniqueEntityID } from '@/core/unique-entity-id'

const futureDate = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
const pastDate = () => new Date(Date.now() - 1000)

describe('RefreshToken', () => {
  describe('create()', () => {
    it('should create a token with the given fields', () => {
      const expires = futureDate()
      const token = RefreshToken.create({
        userId: 'user-1',
        token: 'random-token-string',
        expiresAt: expires,
      })
      expect(token.userId).toBe('user-1')
      expect(token.token).toBe('random-token-string')
      expect(token.expiresAt).toBe(expires)
    })

    it('should set revokedAt to null on creation', () => {
      const token = RefreshToken.create({
        userId: 'uid',
        token: 'tok',
        expiresAt: futureDate(),
      })
      expect(token.revokedAt).toBeNull()
    })

    it('should set createdAt on creation', () => {
      const before = new Date()
      const token = RefreshToken.create({
        userId: 'uid',
        token: 'tok',
        expiresAt: futureDate(),
      })
      expect(token.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })
  })

  describe('isExpired', () => {
    it('should return false when expiresAt is in the future', () => {
      const token = RefreshToken.create({
        userId: 'uid',
        token: 'tok',
        expiresAt: futureDate(),
      })
      expect(token.isExpired).toBe(false)
    })

    it('should return true when expiresAt is in the past', () => {
      const token = RefreshToken.create({
        userId: 'uid',
        token: 'tok',
        expiresAt: pastDate(),
      })
      expect(token.isExpired).toBe(true)
    })
  })

  describe('isRevoked', () => {
    it('should return false when token has not been revoked', () => {
      const token = RefreshToken.create({
        userId: 'uid',
        token: 'tok',
        expiresAt: futureDate(),
      })
      expect(token.isRevoked).toBe(false)
    })

    it('should return true after revoke()', () => {
      const token = RefreshToken.create({
        userId: 'uid',
        token: 'tok',
        expiresAt: futureDate(),
      })
      token.revoke()
      expect(token.isRevoked).toBe(true)
      expect(token.revokedAt).not.toBeNull()
    })
  })

  describe('isValid', () => {
    it('should return true when not expired and not revoked', () => {
      const token = RefreshToken.create({
        userId: 'uid',
        token: 'tok',
        expiresAt: futureDate(),
      })
      expect(token.isValid).toBe(true)
    })

    it('should return false when expired', () => {
      const token = RefreshToken.create({
        userId: 'uid',
        token: 'tok',
        expiresAt: pastDate(),
      })
      expect(token.isValid).toBe(false)
    })

    it('should return false when revoked', () => {
      const token = RefreshToken.create({
        userId: 'uid',
        token: 'tok',
        expiresAt: futureDate(),
      })
      token.revoke()
      expect(token.isValid).toBe(false)
    })

    it('should return false when both expired and revoked', () => {
      const token = RefreshToken.create({
        userId: 'uid',
        token: 'tok',
        expiresAt: pastDate(),
      })
      token.revoke()
      expect(token.isValid).toBe(false)
    })
  })

  describe('restore()', () => {
    it('should restore from persistence with given id', () => {
      const id = new UniqueEntityID('token-id')
      const token = RefreshToken.restore(
        {
          userId: 'user-id',
          token: 'stored-token',
          expiresAt: futureDate(),
          revokedAt: null,
          createdAt: new Date(),
        },
        id,
      )
      expect(token.id.value).toBe('token-id')
      expect(token.token).toBe('stored-token')
    })
  })
})
