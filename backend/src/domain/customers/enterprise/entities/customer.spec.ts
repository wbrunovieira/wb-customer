import { describe, it, expect } from 'vitest'
import { Customer } from './customer'
import { CustomerStatus } from '../value-objects/customer-status.vo'
import { CustomerCreatedEvent } from '../events/customer-created.event'
import { CustomerUpdatedEvent } from '../events/customer-updated.event'
import { UniqueEntityID } from '@/core/unique-entity-id'

describe('Customer', () => {
  it('should create a customer with default lead status', () => {
    const customer = Customer.create({
      name: 'Acme Corp',
      email: 'contact@acme.com',
      createdByUserId: 'user-1',
    })

    expect(customer.name).toBe('Acme Corp')
    expect(customer.email).toBe('contact@acme.com')
    expect(customer.status.value).toBe('lead')
    expect(customer.isDeleted).toBe(false)
  })

  it('should emit CustomerCreatedEvent on creation', () => {
    const customer = Customer.create({
      name: 'Acme Corp',
      email: 'contact@acme.com',
      createdByUserId: 'user-1',
    })

    expect(customer.domainEvents).toHaveLength(1)
    expect(customer.domainEvents[0]).toBeInstanceOf(CustomerCreatedEvent)
  })

  it('should NOT emit CustomerCreatedEvent when restoring', () => {
    const customer = Customer.restore(
      {
        name: 'Acme Corp',
        email: 'contact@acme.com',
        status: CustomerStatus.createUnsafe('active'),
        createdByUserId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      new UniqueEntityID('existing-id'),
    )

    expect(customer.domainEvents).toHaveLength(0)
  })

  it('should update fields and emit CustomerUpdatedEvent', () => {
    const customer = Customer.create({
      name: 'Acme Corp',
      email: 'contact@acme.com',
      createdByUserId: 'user-1',
    })
    customer.clearEvents()

    customer.update({ name: 'Acme Corp Updated', status: CustomerStatus.createUnsafe('active') }, 'user-2')

    expect(customer.name).toBe('Acme Corp Updated')
    expect(customer.status.value).toBe('active')
    expect(customer.domainEvents).toHaveLength(1)
    expect(customer.domainEvents[0]).toBeInstanceOf(CustomerUpdatedEvent)
  })

  it('should soft delete correctly', () => {
    const customer = Customer.create({
      name: 'Acme Corp',
      email: 'contact@acme.com',
      createdByUserId: 'user-1',
    })

    customer.softDelete()

    expect(customer.isDeleted).toBe(true)
    expect(customer.deletedAt).not.toBeNull()
  })

  it('should set driveFolderId', () => {
    const customer = Customer.create({
      name: 'Acme Corp',
      email: 'contact@acme.com',
      createdByUserId: 'user-1',
    })

    customer.setDriveFolderId('drive-folder-id')

    expect(customer.driveFolderId).toBe('drive-folder-id')
  })
})
