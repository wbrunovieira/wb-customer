import { describe, it, expect } from 'vitest'
import { Email } from './email.vo'
import { InvalidEmailError } from '../../domain/exceptions/invalid-email.error'

describe('Email VO', () => {
  describe('create()', () => {
    it('should create a valid email', () => {
      const result = Email.create('user@example.com')
      expect(result.isRight()).toBe(true)
      if (result.isRight()) {
        expect(result.value.value).toBe('user@example.com')
      }
    })

    it('should normalize email to lowercase', () => {
      const result = Email.create('User@Example.COM')
      expect(result.isRight()).toBe(true)
      if (result.isRight()) {
        expect(result.value.value).toBe('user@example.com')
      }
    })

    it('should trim whitespace', () => {
      const result = Email.create('  user@example.com  ')
      expect(result.isRight()).toBe(true)
      if (result.isRight()) {
        expect(result.value.value).toBe('user@example.com')
      }
    })

    it('should return Left for email without @', () => {
      const result = Email.create('invalidemail.com')
      expect(result.isLeft()).toBe(true)
      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(InvalidEmailError)
      }
    })

    it('should return Left for email without domain', () => {
      const result = Email.create('user@')
      expect(result.isLeft()).toBe(true)
    })

    it('should return Left for empty string', () => {
      const result = Email.create('')
      expect(result.isLeft()).toBe(true)
    })

    it('should return Left for email with spaces', () => {
      const result = Email.create('user @example.com')
      expect(result.isLeft()).toBe(true)
    })

    it('should accept subdomains', () => {
      const result = Email.create('user@mail.example.com')
      expect(result.isRight()).toBe(true)
    })
  })

  describe('createUnsafe()', () => {
    it('should create email without validation', () => {
      const email = Email.createUnsafe('stored@db.com')
      expect(email.value).toBe('stored@db.com')
    })
  })

  describe('equals()', () => {
    it('should return true for identical emails', () => {
      const e1 = Email.createUnsafe('a@b.com')
      const e2 = Email.createUnsafe('a@b.com')
      expect(e1.equals(e2)).toBe(true)
    })

    it('should return false for different emails', () => {
      const e1 = Email.createUnsafe('a@b.com')
      const e2 = Email.createUnsafe('c@b.com')
      expect(e1.equals(e2)).toBe(false)
    })
  })

  describe('toString()', () => {
    it('should return the email string', () => {
      const email = Email.createUnsafe('user@example.com')
      expect(email.toString()).toBe('user@example.com')
    })
  })
})
