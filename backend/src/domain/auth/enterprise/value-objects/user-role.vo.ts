import { Either, left, right } from '@/core/either'
import { InvalidRoleError } from '../../domain/exceptions/invalid-role.error'

export type UserRoleType = 'admin' | 'manager' | 'employee' | 'customer'

const VALID_ROLES: UserRoleType[] = ['admin', 'manager', 'employee', 'customer']

export class UserRole {
  private readonly _value: UserRoleType

  private constructor(value: UserRoleType) {
    this._value = value
  }

  static create(value: string): Either<InvalidRoleError, UserRole> {
    if (!VALID_ROLES.includes(value as UserRoleType)) {
      return left(new InvalidRoleError(value))
    }
    return right(new UserRole(value as UserRoleType))
  }

  static createUnsafe(value: string): UserRole {
    return new UserRole(value as UserRoleType)
  }

  get value(): UserRoleType {
    return this._value
  }

  isAdmin(): boolean {
    return this._value === 'admin'
  }

  isManager(): boolean {
    return this._value === 'manager'
  }

  isEmployee(): boolean {
    return this._value === 'employee'
  }

  isCustomer(): boolean {
    return this._value === 'customer'
  }

  equals(other: UserRole): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
