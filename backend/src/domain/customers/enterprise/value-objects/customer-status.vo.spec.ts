import { describe, it, expect } from 'vitest'
import { CustomerStatus } from './customer-status.vo'
import { InvalidCustomerStatusError } from '../../domain/exceptions/invalid-customer-status.error'

describe('CustomerStatus', () => {
  it('should create a valid active status', () => {
    const result = CustomerStatus.create('active')
    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.isActive()).toBe(true)
    }
  })

  it('should create a valid inactive status', () => {
    const result = CustomerStatus.create('inactive')
    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.isInactive()).toBe(true)
    }
  })

  it('should return InvalidCustomerStatusError for lead (removed status)', () => {
    const result = CustomerStatus.create('lead')
    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidCustomerStatusError)
    }
  })

  it('should return InvalidCustomerStatusError for unknown status', () => {
    const result = CustomerStatus.create('suspended')
    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidCustomerStatusError)
    }
  })

  it('should create unsafe without validation', () => {
    const status = CustomerStatus.createUnsafe('active')
    expect(status.value).toBe('active')
  })

  it('should compare equality correctly', () => {
    const a = CustomerStatus.createUnsafe('active')
    const b = CustomerStatus.createUnsafe('active')
    const c = CustomerStatus.createUnsafe('inactive')
    expect(a.equals(b)).toBe(true)
    expect(a.equals(c)).toBe(false)
  })
})
