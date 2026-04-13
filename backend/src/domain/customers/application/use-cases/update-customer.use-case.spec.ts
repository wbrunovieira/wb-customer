import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateCustomerUseCase } from './update-customer.use-case'
import { InMemoryCustomerRepository } from '@/test/repositories/customers/in-memory-customer.repository'
import { InMemoryCustomerActivityRepository } from '@/test/repositories/customers/in-memory-customer-activity.repository'
import { InMemoryCustomerCategoryRepository } from '@/test/repositories/customers/in-memory-customer-category.repository'
import { Customer } from '../../enterprise/entities/customer'
import { CustomerCategory } from '../../enterprise/entities/customer-category'
import { CustomerNotFoundError } from '../../domain/exceptions/customer-not-found.error'
import { CustomerAlreadyExistsError } from '../../domain/exceptions/customer-already-exists.error'
import { CustomerCategoryNotFoundError } from '../../domain/exceptions/customer-category-not-found.error'
import { InvalidCustomerStatusError } from '../../domain/exceptions/invalid-customer-status.error'

let customerRepo: InMemoryCustomerRepository
let activityRepo: InMemoryCustomerActivityRepository
let categoryRepo: InMemoryCustomerCategoryRepository
let sut: UpdateCustomerUseCase

beforeEach(() => {
  customerRepo = new InMemoryCustomerRepository()
  activityRepo = new InMemoryCustomerActivityRepository()
  categoryRepo = new InMemoryCustomerCategoryRepository()
  sut = new UpdateCustomerUseCase(customerRepo, activityRepo, categoryRepo)
})

describe('UpdateCustomerUseCase', () => {
  it('should update a customer successfully', async () => {
    const customer = Customer.create({
      name: 'Acme Corp',
      email: 'contact@acme.com',
      createdByUserId: 'user-1',
    })
    await customerRepo.save(customer)

    const result = await sut.execute({
      customerId: customer.id.value,
      updatedByUserId: 'user-1',
      name: 'Acme Corp Updated',
      status: 'active',
    })

    expect(result.isRight()).toBe(true)
    expect(customerRepo.items[0].name).toBe('Acme Corp Updated')
    expect(customerRepo.items[0].status.value).toBe('active')
    expect(activityRepo.items).toHaveLength(1)
    expect(activityRepo.items[0].type).toBe('updated')
  })

  it('should assign a valid category', async () => {
    const customer = Customer.create({
      name: 'Acme Corp',
      email: 'contact@acme.com',
      createdByUserId: 'user-1',
    })
    await customerRepo.save(customer)

    const category = CustomerCategory.create({ name: 'SaaS' })
    await categoryRepo.save(category)

    const result = await sut.execute({
      customerId: customer.id.value,
      updatedByUserId: 'user-1',
      categoryId: category.id.value,
    })

    expect(result.isRight()).toBe(true)
    expect(customerRepo.items[0].categoryId).toBe(category.id.value)
  })

  it('should return CustomerNotFoundError for unknown id', async () => {
    const result = await sut.execute({
      customerId: 'non-existent',
      updatedByUserId: 'user-1',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(CustomerNotFoundError)
    }
  })

  it('should return CustomerAlreadyExistsError when changing to duplicate email', async () => {
    const c1 = Customer.create({
      name: 'Acme',
      email: 'acme@example.com',
      createdByUserId: 'user-1',
    })
    const c2 = Customer.create({
      name: 'Beta',
      email: 'beta@example.com',
      createdByUserId: 'user-1',
    })
    await customerRepo.save(c1)
    await customerRepo.save(c2)

    const result = await sut.execute({
      customerId: c2.id.value,
      updatedByUserId: 'user-1',
      email: 'acme@example.com',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(CustomerAlreadyExistsError)
    }
  })

  it('should return CustomerCategoryNotFoundError for unknown categoryId', async () => {
    const customer = Customer.create({
      name: 'Acme',
      email: 'acme@example.com',
      createdByUserId: 'user-1',
    })
    await customerRepo.save(customer)

    const result = await sut.execute({
      customerId: customer.id.value,
      updatedByUserId: 'user-1',
      categoryId: 'non-existent-category',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(CustomerCategoryNotFoundError)
    }
  })

  it('should return InvalidCustomerStatusError for unknown status', async () => {
    const customer = Customer.create({
      name: 'Acme',
      email: 'acme@example.com',
      createdByUserId: 'user-1',
    })
    await customerRepo.save(customer)

    const result = await sut.execute({
      customerId: customer.id.value,
      updatedByUserId: 'user-1',
      status: 'suspended',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidCustomerStatusError)
    }
  })
})
