import { describe, it, expect } from 'vitest'
import { Password } from './password.vo'
import { WeakPasswordError } from '../../domain/exceptions/weak-password.error'

describe('Password VO', () => {
  describe('create()', () => {
    it('should create a valid password', () => {
      const result = Password.create('MySecurePass1@')
      expect(result.isRight()).toBe(true)
    })

    it('should return Left for password shorter than 8 chars', () => {
      const result = Password.create('short')
      expect(result.isLeft()).toBe(true)
      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(WeakPasswordError)
      }
    })

    it('should accept exactly 8 characters', () => {
      const result = Password.create('12345678')
      expect(result.isRight()).toBe(true)
    })

    it('should return Left for empty string', () => {
      const result = Password.create('')
      expect(result.isLeft()).toBe(true)
    })

    it('should store as unhashed', () => {
      const result = Password.create('securepassword')
      if (result.isRight()) {
        expect(result.value.isHashed).toBe(false)
      }
    })
  })

  describe('createFromHash()', () => {
    it('should create a hashed password', () => {
      const password = Password.createFromHash('$2b$08$hashedvalue')
      expect(password.isHashed).toBe(true)
    })

    it('should store the hash as value', () => {
      const hash = '$2b$08$somehashedvalue'
      const password = Password.createFromHash(hash)
      expect(password.value).toBe(hash)
    })
  })

  describe('getHash()', () => {
    it('should return a bcrypt hash for a plain password', async () => {
      const result = Password.create('plainpassword')
      if (result.isRight()) {
        const hash = await result.value.getHash()
        expect(hash).toMatch(/^\$2[ab]\$/)
      }
    })

    it('should return the same value for an already-hashed password', async () => {
      const hash = '$2b$08$existinghashvalue'
      const password = Password.createFromHash(hash)
      const returned = await password.getHash()
      expect(returned).toBe(hash)
    })

    it('should generate different hashes for the same input (bcrypt salting)', async () => {
      const result1 = Password.create('samepassword')
      const result2 = Password.create('samepassword')
      if (result1.isRight() && result2.isRight()) {
        const hash1 = await result1.value.getHash()
        const hash2 = await result2.value.getHash()
        expect(hash1).not.toBe(hash2)
      }
    })
  })

  describe('compare()', () => {
    it('should return true when plaintext matches a bcrypt hash', async () => {
      const plain = 'mypassword123'
      const passwordVO = Password.create(plain)
      if (passwordVO.isRight()) {
        const hash = await passwordVO.value.getHash()
        const stored = Password.createFromHash(hash)
        expect(await stored.compare(plain)).toBe(true)
      }
    })

    it('should return false when plaintext does not match', async () => {
      const plain = 'mypassword123'
      const passwordVO = Password.create(plain)
      if (passwordVO.isRight()) {
        const hash = await passwordVO.value.getHash()
        const stored = Password.createFromHash(hash)
        expect(await stored.compare('wrongpassword')).toBe(false)
      }
    })

    it('should compare correctly for an unhashed password', async () => {
      const result = Password.create('rawpassword')
      if (result.isRight()) {
        expect(await result.value.compare('rawpassword')).toBe(true)
        expect(await result.value.compare('other')).toBe(false)
      }
    })
  })
})
