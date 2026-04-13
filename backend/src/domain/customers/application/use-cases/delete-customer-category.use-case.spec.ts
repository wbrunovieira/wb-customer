import { describe, it, expect, beforeEach } from 'vitest'
import { DeleteCustomerCategoryUseCase } from './delete-customer-category.use-case'
import { InMemoryCustomerCategoryRepository } from '@/test/repositories/customers/in-memory-customer-category.repository'
import { CustomerCategory } from '../../enterprise/entities/customer-category'
import { CustomerCategoryNotFoundError } from '../../domain/exceptions/customer-category-not-found.error'

let categoryRepo: InMemoryCustomerCategoryRepository
let sut: DeleteCustomerCategoryUseCase

beforeEach(() => {
  categoryRepo = new InMemoryCustomerCategoryRepository()
  sut = new DeleteCustomerCategoryUseCase(categoryRepo)
})

describe('DeleteCustomerCategoryUseCase', () => {
  it('should soft delete a category', async () => {
    const category = CustomerCategory.create({ name: 'SaaS' })
    await categoryRepo.save(category)

    const result = await sut.execute({ categoryId: category.id.value })

    expect(result.isRight()).toBe(true)
    expect(categoryRepo.items[0].isDeleted).toBe(true)
  })

  it('should return CustomerCategoryNotFoundError for unknown id', async () => {
    const result = await sut.execute({ categoryId: 'non-existent-id' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(CustomerCategoryNotFoundError)
    }
  })
})
