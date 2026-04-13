import { describe, it, expect, beforeEach } from 'vitest'
import { CreateCustomerUseCase } from './create-customer.use-case'
import { InMemoryCustomerRepository } from '@/test/repositories/customers/in-memory-customer.repository'
import { InMemoryCustomerActivityRepository } from '@/test/repositories/customers/in-memory-customer-activity.repository'
import { InMemoryCustomerCategoryRepository } from '@/test/repositories/customers/in-memory-customer-category.repository'
import { FakeCustomerFolderService } from '@/test/repositories/customers/fake-customer-folder.service'
import { CustomerCategory } from '../../enterprise/entities/customer-category'
import { CustomerAlreadyExistsError } from '../../domain/exceptions/customer-already-exists.error'
import { CustomerCategoryNotFoundError } from '../../domain/exceptions/customer-category-not-found.error'

let customerRepo: InMemoryCustomerRepository
let activityRepo: InMemoryCustomerActivityRepository
let categoryRepo: InMemoryCustomerCategoryRepository
let folderService: FakeCustomerFolderService
let sut: CreateCustomerUseCase

beforeEach(() => {
  customerRepo = new InMemoryCustomerRepository()
  activityRepo = new InMemoryCustomerActivityRepository()
  categoryRepo = new InMemoryCustomerCategoryRepository()
  folderService = new FakeCustomerFolderService()
  sut = new CreateCustomerUseCase(
    customerRepo,
    activityRepo,
    categoryRepo,
    folderService,
  )
})

describe('CreateCustomerUseCase', () => {
  it('should create a customer successfully', async () => {
    const result = await sut.execute({
      name: 'Acme Corp',
      email: 'contact@acme.com',
      createdByUserId: 'user-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.customerId).toBeDefined()
    }
    expect(customerRepo.items).toHaveLength(1)
    expect(activityRepo.items).toHaveLength(1)
    expect(activityRepo.items[0].type).toBe('created')
  })

  it('should create a Drive folder and set driveFolderId', async () => {
    await sut.execute({
      name: 'Acme Corp',
      email: 'contact@acme.com',
      createdByUserId: 'user-1',
    })

    expect(folderService.createdFolders).toHaveLength(1)
    expect(customerRepo.items[0].driveFolderId).toBeDefined()
    expect(customerRepo.items[0].driveFolderId).not.toBeNull()
  })

  it('should create a customer with a valid category', async () => {
    const category = CustomerCategory.create({ name: 'SaaS' })
    await categoryRepo.save(category)

    const result = await sut.execute({
      name: 'Acme Corp',
      email: 'contact@acme.com',
      categoryId: category.id.value,
      createdByUserId: 'user-1',
    })

    expect(result.isRight()).toBe(true)
    expect(customerRepo.items[0].categoryId).toBe(category.id.value)
  })

  it('should return CustomerAlreadyExistsError for duplicate email', async () => {
    await sut.execute({
      name: 'Acme Corp',
      email: 'contact@acme.com',
      createdByUserId: 'user-1',
    })

    const result = await sut.execute({
      name: 'Another Corp',
      email: 'contact@acme.com',
      createdByUserId: 'user-1',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(CustomerAlreadyExistsError)
    }
    expect(customerRepo.items).toHaveLength(1)
  })

  it('should return CustomerCategoryNotFoundError for unknown categoryId', async () => {
    const result = await sut.execute({
      name: 'Acme Corp',
      email: 'contact@acme.com',
      categoryId: 'non-existent-category-id',
      createdByUserId: 'user-1',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(CustomerCategoryNotFoundError)
    }
  })
})
