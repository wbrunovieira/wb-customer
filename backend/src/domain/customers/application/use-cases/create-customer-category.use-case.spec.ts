import { describe, it, expect, beforeEach } from 'vitest'
import { CreateCustomerCategoryUseCase } from './create-customer-category.use-case'
import { InMemoryCustomerCategoryRepository } from '@/test/repositories/customers/in-memory-customer-category.repository'
import { CustomerCategoryAlreadyExistsError } from '../../domain/exceptions/customer-category-already-exists.error'

let categoryRepo: InMemoryCustomerCategoryRepository
let sut: CreateCustomerCategoryUseCase

beforeEach(() => {
  categoryRepo = new InMemoryCustomerCategoryRepository()
  sut = new CreateCustomerCategoryUseCase(categoryRepo)
})

describe('CreateCustomerCategoryUseCase', () => {
  it('should create a category successfully', async () => {
    const result = await sut.execute({ name: 'SaaS', description: 'Software companies' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.categoryId).toBeDefined()
    }
    expect(categoryRepo.items).toHaveLength(1)
    expect(categoryRepo.items[0].name).toBe('SaaS')
  })

  it('should create a category without description', async () => {
    const result = await sut.execute({ name: 'Agency' })

    expect(result.isRight()).toBe(true)
    expect(categoryRepo.items[0].description).toBeNull()
  })

  it('should return CustomerCategoryAlreadyExistsError for duplicate name', async () => {
    await sut.execute({ name: 'SaaS' })

    const result = await sut.execute({ name: 'SaaS' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(CustomerCategoryAlreadyExistsError)
    }
    expect(categoryRepo.items).toHaveLength(1)
  })
})
