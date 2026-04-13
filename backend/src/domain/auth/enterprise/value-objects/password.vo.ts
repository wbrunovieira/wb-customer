import * as bcrypt from 'bcryptjs'
import { Either, left, right } from '@/core/either'
import { WeakPasswordError } from '../../domain/exceptions/weak-password.error'

const SALT_ROUNDS = 8

export class Password {
  private readonly _value: string
  private readonly _hashed: boolean

  private constructor(value: string, hashed: boolean) {
    this._value = value
    this._hashed = hashed
  }

  static create(raw: string): Either<WeakPasswordError, Password> {
    if (!Password.isStrong(raw)) {
      return left(new WeakPasswordError())
    }
    return right(new Password(raw, false))
  }

  static createFromHash(hash: string): Password {
    return new Password(hash, true)
  }

  private static isStrong(password: string): boolean {
    return password.length >= 8
  }

  async getHash(): Promise<string> {
    if (this._hashed) return this._value
    return bcrypt.hash(this._value, SALT_ROUNDS)
  }

  async compare(plainText: string): Promise<boolean> {
    if (!this._hashed) {
      return this._value === plainText
    }
    return bcrypt.compare(plainText, this._value)
  }

  get value(): string {
    return this._value
  }

  get isHashed(): boolean {
    return this._hashed
  }
}
