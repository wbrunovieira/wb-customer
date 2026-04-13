import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateCustomerCategoryUseCase } from './update-customer-category.use-case'
import { InMemoryCustomerCategoryRepository } from '@/test/repositories/customers/in-memory-customer-category.repository'
import { CustomerCategory } from '../../enterprise/entities/customer-category'
import { CustomerCategoryNotFoundError } from '../../domain/exceptions/customer-category-not-found.error'
import { CustomerCategoryAlreadyExistsError } from '../../domain/exceptions/customer-category-already-exists.error'

let categoryRepo: InMemoryCustomerCategoryRepository
let sut: UpdateCustomerCategoryUseCase

beforeEach(() => {
  categoryRepo = new InMemoryCustomerCategoryRepository()
  sut = new UpdateCustomerCategoryUseCase(categoryRepo)
})

describe('UpdateCustomerCategoryUseCase', () => {
  it('should update a category successfully', async () => {
    const category = CustomerCategory.create({ name: 'SaaS' })
    await categoryRepo.save(category)

    const result = await sut.execute({
      categoryId: category.id.value,
      name: 'SaaS Updated',
      description: 'New description',
    })

    expect(result.isRight()).toBe(true)
    expect(categoryRepo.items[0].name).toBe('SaaS Updated')
    expect(categoryRepo.items[0].description).toBe('New description')
  })

  it('should deactivate a category', async () => {
    const category = CustomerCategory.create({ name: 'SaaS' })
    await categoryRepo.save(category)

    const result = await sut.execute({
      categoryId: category.id.value,
      isActive: false,
    })

    expect(result.isRight()).toBe(true)
    expect(categoryRepo.items[0].isActive).toBe(false)
  })

  it('should return CustomerCategoryNotFoundError for unknown id', async () => {
    const result = await sut.execute({
      categoryId: 'non-existent-id',
      name: 'New Name',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(CustomerCategoryNotFoundError)
    }
  })

  it('should return CustomerCategoryAlreadyExistsError when renaming to existing name', async () => {
    const cat1 = CustomerCategory.create({ name: 'SaaS' })
    const cat2 = CustomerCategory.create({ name: 'Agency' })
    await categoryRepo.save(cat1)
    await categoryRepo.save(cat2)

    const result = await sut.execute({
      categoryId: cat2.id.value,
      name: 'SaaS',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(CustomerCategoryAlreadyExistsError)
    }
  })
})
