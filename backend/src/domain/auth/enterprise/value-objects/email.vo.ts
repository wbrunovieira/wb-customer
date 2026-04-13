import { Either, left, right } from '@/core/either'
import { InvalidEmailError } from '../../domain/exceptions/invalid-email.error'

export class Email {
  private readonly _value: string

  private constructor(value: string) {
    this._value = value
  }

  static create(value: string): Either<InvalidEmailError, Email> {
    const normalized = value.toLowerCase().trim()
    if (!Email.isValid(normalized)) {
      return left(new InvalidEmailError(value))
    }
    return right(new Email(normalized))
  }

  static createUnsafe(value: string): Email {
    return new Email(value.toLowerCase().trim())
  }

  private static isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 255
  }

  get value(): string {
    return this._value
  }

  equals(other: Email): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
