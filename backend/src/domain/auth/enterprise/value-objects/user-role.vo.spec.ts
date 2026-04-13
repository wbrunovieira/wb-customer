import { describe, it, expect } from 'vitest'
import { UserRole } from './user-role.vo'
import { InvalidRoleError } from '../../domain/exceptions/invalid-role.error'

describe('UserRole VO', () => {
  describe('create()', () => {
    it.each(['admin', 'manager', 'employee', 'customer'])(
      'should create a valid role: %s',
      (role) => {
        const result = UserRole.create(role)
        expect(result.isRight()).toBe(true)
        if (result.isRight()) {
          expect(result.value.value).toBe(role)
        }
      },
    )

    it('should return Left for an invalid role', () => {
      const result = UserRole.create('superuser')
      expect(result.isLeft()).toBe(true)
      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(InvalidRoleError)
      }
    })

    it('should return Left for empty string', () => {
      const result = UserRole.create('')
      expect(result.isLeft()).toBe(true)
    })
  })

  describe('role helpers', () => {
    it('isAdmin() returns true only for admin', () => {
      const role = UserRole.createUnsafe('admin')
      expect(role.isAdmin()).toBe(true)
      expect(role.isManager()).toBe(false)
      expect(role.isEmployee()).toBe(false)
      expect(role.isCustomer()).toBe(false)
    })

    it('isManager() returns true only for manager', () => {
      const role = UserRole.createUnsafe('manager')
      expect(role.isManager()).toBe(true)
      expect(role.isAdmin()).toBe(false)
    })

    it('isEmployee() returns true only for employee', () => {
      const role = UserRole.createUnsafe('employee')
      expect(role.isEmployee()).toBe(true)
      expect(role.isAdmin()).toBe(false)
    })

    it('isCustomer() returns true only for customer', () => {
      const role = UserRole.createUnsafe('customer')
      expect(role.isCustomer()).toBe(true)
      expect(role.isAdmin()).toBe(false)
    })
  })

  describe('equals()', () => {
    it('should return true for the same role', () => {
      const r1 = UserRole.createUnsafe('admin')
      const r2 = UserRole.createUnsafe('admin')
      expect(r1.equals(r2)).toBe(true)
    })

    it('should return false for different roles', () => {
      const r1 = UserRole.createUnsafe('admin')
      const r2 = UserRole.createUnsafe('employee')
      expect(r1.equals(r2)).toBe(false)
    })
  })

  describe('toString()', () => {
    it('should return the role string', () => {
      const role = UserRole.createUnsafe('manager')
      expect(role.toString()).toBe('manager')
    })
  })
})
