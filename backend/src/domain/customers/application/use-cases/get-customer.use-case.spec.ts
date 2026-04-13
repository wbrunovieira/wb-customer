import { describe, it, expect, beforeEach } from 'vitest'
import { GetCustomerUseCase } from './get-customer.use-case'
import { InMemoryCustomerRepository } from '@/test/repositories/customers/in-memory-customer.repository'
import { InMemoryContactRepository } from '@/test/repositories/customers/in-memory-contact.repository'
import { Customer } from '../../enterprise/entities/customer'
import { Contact } from '../../enterprise/entities/contact'
import { CustomerNotFoundError } from '../../domain/exceptions/customer-not-found.error'

let customerRepo: InMemoryCustomerRepository
let contactRepo: InMemoryContactRepository
let sut: GetCustomerUseCase

beforeEach(() => {
  customerRepo = new InMemoryCustomerRepository()
  contactRepo = new InMemoryContactRepository()
  sut = new GetCustomerUseCase(customerRepo, contactRepo)
})

describe('GetCustomerUseCase', () => {
  it('should return customer with contacts and employees', async () => {
    const customer = Customer.create({
      name: 'Acme Corp',
      email: 'contact@acme.com',
      createdByUserId: 'user-1',
    })
    await customerRepo.save(customer)

    const contact = Contact.create({
      customerId: customer.id.value,
      name: 'John Doe',
      isPrimary: true,
    })
    await contactRepo.save(contact)

    await customerRepo.assignEmployee(customer.id.value, 'employee-1', 'user-1')

    const result = await sut.execute({ customerId: customer.id.value })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.customer.name).toBe('Acme Corp')
      expect(result.value.contacts).toHaveLength(1)
      expect(result.value.employees).toHaveLength(1)
    }
  })

  it('should return CustomerNotFoundError for unknown id', async () => {
    const result = await sut.execute({ customerId: 'non-existent' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(CustomerNotFoundError)
    }
  })
})
