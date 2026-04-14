import { Either, left, right } from '@/core/either'
import { InvalidCustomerStatusError } from '../../domain/exceptions/invalid-customer-status.error'

export type CustomerStatusType = 'active' | 'inactive'

const VALID_STATUSES: CustomerStatusType[] = ['active', 'inactive']

export class CustomerStatus {
  private readonly _value: CustomerStatusType

  private constructor(value: CustomerStatusType) {
    this._value = value
  }

  static create(value: string): Either<InvalidCustomerStatusError, CustomerStatus> {
    if (!VALID_STATUSES.includes(value as CustomerStatusType)) {
      return left(new InvalidCustomerStatusError(value))
    }
    return right(new CustomerStatus(value as CustomerStatusType))
  }

  static createUnsafe(value: string): CustomerStatus {
    return new CustomerStatus(value as CustomerStatusType)
  }

  get value(): CustomerStatusType {
    return this._value
  }

  isActive(): boolean {
    return this._value === 'active'
  }

  isInactive(): boolean {
    return this._value === 'inactive'
  }

  equals(other: CustomerStatus): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
