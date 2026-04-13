import { Either, left, right } from '@/core/either'
import { InvalidCnpjError } from '../../domain/exceptions/invalid-cnpj.error'

export class Cnpj {
  private readonly _value: string // stored as 14 raw digits

  private constructor(value: string) {
    this._value = value
  }

  static create(value: string): Either<InvalidCnpjError, Cnpj> {
    const digits = value.replace(/\D/g, '')
    if (!Cnpj.isValid(digits)) {
      return left(new InvalidCnpjError(value))
    }
    return right(new Cnpj(digits))
  }

  static createUnsafe(value: string): Cnpj {
    return new Cnpj(value.replace(/\D/g, ''))
  }

  private static isValid(digits: string): boolean {
    if (digits.length !== 14) return false
    if (/^(\d)\1{13}$/.test(digits)) return false

    let sum = 0
    let weight = 5
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits[i]) * weight
      weight = weight === 2 ? 9 : weight - 1
    }
    let remainder = sum % 11
    const digit1 = remainder < 2 ? 0 : 11 - remainder
    if (parseInt(digits[12]) !== digit1) return false

    sum = 0
    weight = 6
    for (let i = 0; i < 13; i++) {
      sum += parseInt(digits[i]) * weight
      weight = weight === 2 ? 9 : weight - 1
    }
    remainder = sum % 11
    const digit2 = remainder < 2 ? 0 : 11 - remainder
    if (parseInt(digits[13]) !== digit2) return false

    return true
  }

  get value(): string {
    return this._value
  }

  get formatted(): string {
    return this._value.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5',
    )
  }

  equals(other: Cnpj): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this.formatted
  }
}
