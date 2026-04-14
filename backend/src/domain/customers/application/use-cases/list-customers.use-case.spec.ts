import { describe, it, expect, beforeEach } from 'vitest'
import { ListCustomersUseCase } from './list-customers.use-case'
import { InMemoryCustomerRepository } from '@/test/repositories/customers/in-memory-customer.repository'
import { Customer } from '../../enterprise/entities/customer'
import { CustomerStatus } from '../../enterprise/value-objects/customer-status.vo'

let customerRepo: InMemoryCustomerRepository
let sut: ListCustomersUseCase

beforeEach(() => {
  customerRepo = new InMemoryCustomerRepository()
  sut = new ListCustomersUseCase(customerRepo)
})

describe('ListCustomersUseCase', () => {
  it('should list all customers paginated', async () => {
    for (let i = 1; i <= 5; i++) {
      await customerRepo.save(
        Customer.create({
          name: `Company ${i}`,
          email: `company${i}@example.com`,
          createdByUserId: 'user-1',
        }),
      )
    }

    const result = await sut.execute({ page: 1, limit: 3 })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(3)
      expect(result.value.total).toBe(5)
    }
  })

  it('should filter by status', async () => {
    const active = Customer.create({
      name: 'Active Co',
      email: 'active@example.com',
      status: CustomerStatus.createUnsafe('active'),
      createdByUserId: 'user-1',
    })
    const lead = Customer.create({
      name: 'Inactive Co',
      email: 'inactive@example.com',
      status: CustomerStatus.createUnsafe('inactive'),
      createdByUserId: 'user-1',
    })
    await customerRepo.save(active)
    await customerRepo.save(lead)

    const result = await sut.execute({ status: 'active' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(1)
      expect(result.value.items[0].name).toBe('Active Co')
    }
  })

  it('should filter by search term', async () => {
    await customerRepo.save(
      Customer.create({ name: 'Acme Corp', email: 'acme@example.com', createdByUserId: 'user-1' }),
    )
    await customerRepo.save(
      Customer.create({ name: 'Beta Ltd', email: 'beta@example.com', createdByUserId: 'user-1' }),
    )

    const result = await sut.execute({ search: 'acme' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(1)
      expect(result.value.items[0].name).toBe('Acme Corp')
    }
  })

  it('should filter by categoryId', async () => {
    const c1 = Customer.create({
      name: 'SaaS Co',
      email: 'saas@example.com',
      categoryId: 'cat-1',
      createdByUserId: 'user-1',
    })
    const c2 = Customer.create({
      name: 'Agency Co',
      email: 'agency@example.com',
      createdByUserId: 'user-1',
    })
    await customerRepo.save(c1)
    await customerRepo.save(c2)

    const result = await sut.execute({ categoryId: 'cat-1' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(1)
      expect(result.value.items[0].name).toBe('SaaS Co')
    }
  })
})
