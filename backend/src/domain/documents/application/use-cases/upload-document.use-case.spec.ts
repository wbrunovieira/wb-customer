import { describe, it, expect, beforeEach } from 'vitest'
import { UploadDocumentUseCase } from './upload-document.use-case'
import { InMemoryDocumentRepository } from '@/test/repositories/documents/in-memory-document.repository'
import { FakeStorageAdapter } from '@/test/repositories/documents/fake-storage.adapter'
import { InMemoryCustomerRepository } from '@/test/repositories/customers/in-memory-customer.repository'
import { InMemoryCustomerActivityRepository } from '@/test/repositories/customers/in-memory-customer-activity.repository'
import { FakeCustomerFolderService } from '@/test/repositories/customers/fake-customer-folder.service'
import { Customer } from '@/domain/customers/enterprise/entities/customer'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { InvalidDocumentTypeError } from '../../domain/exceptions/invalid-document-type.error'

let documentRepo: InMemoryDocumentRepository
let storageAdapter: FakeStorageAdapter
let customerRepo: InMemoryCustomerRepository
let activityRepo: InMemoryCustomerActivityRepository
let folderService: FakeCustomerFolderService
let sut: UploadDocumentUseCase

const customerId = 'customer-1'

beforeEach(() => {
  documentRepo = new InMemoryDocumentRepository()
  storageAdapter = new FakeStorageAdapter()
  customerRepo = new InMemoryCustomerRepository()
  activityRepo = new InMemoryCustomerActivityRepository()
  folderService = new FakeCustomerFolderService()
  sut = new UploadDocumentUseCase(documentRepo, storageAdapter, customerRepo, activityRepo, folderService)

  const customer = Customer.create(
    {
      name: 'Acme Corp',
      email: 'acme@test.com',
      createdByUserId: 'user-1',
    },
    new UniqueEntityID(customerId),
  )
  customer.setDriveFolderId('drive-folder-123')
  customerRepo.items.push(customer)
})

describe('UploadDocumentUseCase', () => {
  it('should upload a document successfully', async () => {
    const result = await sut.execute({
      customerId,
      type: 'proposal',
      title: 'Q1 Proposal',
      mimeType: 'application/pdf',
      sizeBytes: 10240,
      uploadedByUserId: 'user-1',
      buffer: Buffer.from('pdf-content'),
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.documentId).toBeDefined()
    }
    expect(documentRepo.items).toHaveLength(1)
    expect(storageAdapter.uploadedFiles).toHaveLength(1)
    expect(storageAdapter.uploadedFiles[0].folderId).toBe('drive-folder-123')
  })

  it('should record a document_uploaded activity', async () => {
    await sut.execute({
      customerId,
      type: 'contract',
      title: 'Service Contract',
      mimeType: 'application/pdf',
      uploadedByUserId: 'user-1',
      buffer: Buffer.from('pdf-content'),
    })

    expect(activityRepo.items).toHaveLength(1)
    expect(activityRepo.items[0].type).toBe('document_uploaded')
  })

  it('should return CustomerNotFoundError for unknown customer', async () => {
    const result = await sut.execute({
      customerId: 'non-existent',
      type: 'proposal',
      title: 'Q1 Proposal',
      mimeType: 'application/pdf',
      uploadedByUserId: 'user-1',
      buffer: Buffer.from(''),
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(CustomerNotFoundError)
    }
    expect(documentRepo.items).toHaveLength(0)
    expect(storageAdapter.uploadedFiles).toHaveLength(0)
  })

  it('should create Drive folder lazily if driveFolderId is missing', async () => {
    const customer = Customer.create(
      { name: 'No Folder Corp', email: 'nofolder@test.com', createdByUserId: 'user-1' },
      new UniqueEntityID('customer-2'),
    )
    // No driveFolderId set
    customerRepo.items.push(customer)

    const result = await sut.execute({
      customerId: 'customer-2',
      type: 'proposal',
      title: 'Test Doc',
      mimeType: 'application/pdf',
      uploadedByUserId: 'user-1',
      buffer: Buffer.from('content'),
    })

    expect(result.isRight()).toBe(true)
    // folder service was called
    expect(folderService.createdFolders.some((f) => f.name === 'No Folder Corp')).toBe(true)
    // customer was updated with the new folder ID
    const updated = customerRepo.items.find((c) => c.id.value === 'customer-2')
    expect(updated?.driveFolderId).toBeDefined()
    expect(updated?.driveFolderId).not.toBeNull()
  })

  it('should return InvalidDocumentTypeError for unknown type', async () => {
    const result = await sut.execute({
      customerId,
      type: 'invoice',
      title: 'Invoice',
      mimeType: 'application/pdf',
      uploadedByUserId: 'user-1',
      buffer: Buffer.from(''),
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidDocumentTypeError)
    }
  })
})
