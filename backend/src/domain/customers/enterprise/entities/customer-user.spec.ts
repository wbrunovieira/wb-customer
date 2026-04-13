import { describe, it, expect } from 'vitest'
import { CustomerUser } from './customer-user'

describe('CustomerUser entity', () => {
  it('should create with master role', () => {
    const cu = CustomerUser.create({
      userId: 'user-1',
      customerId: 'customer-1',
      customerRole: 'master',
      createdBy: 'admin-1',
    })
    expect(cu.isMaster).toBe(true)
    expect(cu.isDeleted).toBe(false)
    expect(cu.deletedAt).toBeNull()
  })

  it('should create with member role', () => {
    const cu = CustomerUser.create({
      userId: 'user-2',
      customerId: 'customer-1',
      customerRole: 'member',
      createdBy: 'master-user',
    })
    expect(cu.isMaster).toBe(false)
    expect(cu.customerRole).toBe('member')
  })

  it('should soft delete', () => {
    const cu = CustomerUser.create({
      userId: 'user-1',
      customerId: 'customer-1',
      customerRole: 'master',
      createdBy: 'admin-1',
    })
    cu.softDelete()
    expect(cu.isDeleted).toBe(true)
    expect(cu.deletedAt).not.toBeNull()
  })
})
