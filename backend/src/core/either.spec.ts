import { describe, it, expect } from 'vitest'
import { Either, left, right, Left, Right } from './either'

describe('Either', () => {
  describe('left()', () => {
    it('should create a Left instance', () => {
      const result = left<Error, string>(new Error('failed'))
      expect(result).toBeInstanceOf(Left)
    })

    it('should hold the left value', () => {
      const error = new Error('something went wrong')
      const result = left<Error, string>(error)
      expect(result.value).toBe(error)
    })

    it('isLeft() should return true', () => {
      const result = left<string, number>('error')
      expect(result.isLeft()).toBe(true)
    })

    it('isRight() should return false', () => {
      const result = left<string, number>('error')
      expect(result.isRight()).toBe(false)
    })
  })

  describe('right()', () => {
    it('should create a Right instance', () => {
      const result = right<Error, string>('success')
      expect(result).toBeInstanceOf(Right)
    })

    it('should hold the right value', () => {
      const result = right<Error, string>('success')
      expect(result.value).toBe('success')
    })

    it('isRight() should return true', () => {
      const result = right<string, number>(42)
      expect(result.isRight()).toBe(true)
    })

    it('isLeft() should return false', () => {
      const result = right<string, number>(42)
      expect(result.isLeft()).toBe(false)
    })
  })

  describe('type narrowing', () => {
    it('should narrow type to Right when isRight() is true', () => {
      const result: Either<Error, string> = right('ok')
      if (result.isRight()) {
        expect(result.value).toBe('ok')
      } else {
        expect.fail('should have been right')
      }
    })

    it('should narrow type to Left when isLeft() is true', () => {
      const error = new Error('oops')
      const result: Either<Error, string> = left(error)
      if (result.isLeft()) {
        expect(result.value).toBe(error)
      } else {
        expect.fail('should have been left')
      }
    })
  })

  describe('practical use', () => {
    function divide(a: number, b: number): Either<string, number> {
      if (b === 0) return left('Division by zero')
      return right(a / b)
    }

    it('should return right with the result on success', () => {
      const result = divide(10, 2)
      expect(result.isRight()).toBe(true)
      expect(result.value).toBe(5)
    })

    it('should return left with an error message on failure', () => {
      const result = divide(10, 0)
      expect(result.isLeft()).toBe(true)
      expect(result.value).toBe('Division by zero')
    })
  })
})
