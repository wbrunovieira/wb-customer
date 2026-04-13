import { describe, it, expect, beforeEach } from 'vitest'
import { AddContactUseCase } from './add-contact.use-case'
import { InMemoryCustomerRepository } from '@/test/repositories/customers/in-memory-customer.repository'
import { InMemoryContactRepository } from '@/test/repositories/customers/in-memory-contact.repository'
import { InMemoryCustomerActivityRepository } from '@/test/repositories/customers/in-memory-customer-activity.repository'
import { Customer } from '../../enterprise/entities/customer'
import { CustomerNotFoundError } from '../../domain/exceptions/customer-not-found.error'

let customerRepo: InMemoryCustomerRepository
let contactRepo: InMemoryContactRepository
let activityRepo: InMemoryCustomerActivityRepository
let sut: AddContactUseCase

beforeEach(() => {
  customerRepo = new InMemoryCustomerRepository()
  contactRepo = new InMemoryContactRepository()
  activityRepo = new InMemoryCustomerActivityRepository()
  sut = new AddContactUseCase(customerRepo, contactRepo, activityRepo)
})

describe('AddContactUseCase', () => {
  it('should add a contact successfully', async () => {
    const customer = Customer.create({
      name: 'Acme Corp',
      email: 'contact@acme.com',
      createdByUserId: 'user-1',
    })
    await customerRepo.save(customer)

    const result = await sut.execute({
      customerId: customer.id.value,
      addedByUserId: 'user-1',
      name: 'John Doe',
      email: 'john@acme.com',
      role: 'CEO',
      isPrimary: true,
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.contactId).toBeDefined()
    }
    expect(contactRepo.items).toHaveLength(1)
    expect(contactRepo.items[0].isPrimary).toBe(true)
    expect(activityRepo.items[0].type).toBe('contact_added')
  })

  it('should return CustomerNotFoundError for unknown customer', async () => {
    const result = await sut.execute({
      customerId: 'non-existent',
      addedByUserId: 'user-1',
      name: 'John Doe',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(CustomerNotFoundError)
    }
  })
})
