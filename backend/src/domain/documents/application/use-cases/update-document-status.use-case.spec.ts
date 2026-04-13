import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateDocumentStatusUseCase } from './update-document-status.use-case'
import { InMemoryDocumentRepository } from '@/test/repositories/documents/in-memory-document.repository'
import { Document } from '@/domain/documents/enterprise/entities/document'
import { DocumentType } from '../../enterprise/value-objects/document-type.vo'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { DocumentNotFoundError } from '../../domain/exceptions/document-not-found.error'
import { InvalidDocumentStatusError } from '../../domain/exceptions/invalid-document-status.error'

let documentRepo: InMemoryDocumentRepository
let sut: UpdateDocumentStatusUseCase

const customerId = 'customer-1'
const documentId = 'doc-1'

beforeEach(() => {
  documentRepo = new InMemoryDocumentRepository()
  sut = new UpdateDocumentStatusUseCase(documentRepo)

  const doc = Document.create(
    {
      customerId,
      type: DocumentType.createUnsafe('proposal'),
      title: 'Q1 Proposal',
      driveFileId: 'file-123',
      driveViewUrl: 'https://view',
      driveDownloadUrl: 'https://download',
      mimeType: 'application/pdf',
      uploadedByUserId: 'user-1',
    },
    new UniqueEntityID(documentId),
  )
  documentRepo.items.push(doc)
})

describe('UpdateDocumentStatusUseCase', () => {
  it('should update document status to signed', async () => {
    const result = await sut.execute({ customerId, documentId, status: 'signed' })

    expect(result.isRight()).toBe(true)
    expect(documentRepo.items[0].status.value).toBe('signed')
    expect(documentRepo.items[0].signedAt).toBeInstanceOf(Date)
  })

  it('should update document status to cancelled', async () => {
    const result = await sut.execute({ customerId, documentId, status: 'cancelled' })

    expect(result.isRight()).toBe(true)
    expect(documentRepo.items[0].status.value).toBe('cancelled')
  })

  it('should return DocumentNotFoundError for unknown document', async () => {
    const result = await sut.execute({
      customerId,
      documentId: 'non-existent',
      status: 'signed',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(DocumentNotFoundError)
    }
  })

  it('should return DocumentNotFoundError when customerId does not match', async () => {
    const result = await sut.execute({
      customerId: 'other-customer',
      documentId,
      status: 'signed',
    })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(DocumentNotFoundError)
    }
  })

  it('should return InvalidDocumentStatusError for unknown status', async () => {
    const result = await sut.execute({ customerId, documentId, status: 'approved' })

    expect(result.isLeft()).toBe(true)
    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(InvalidDocumentStatusError)
    }
  })
})
