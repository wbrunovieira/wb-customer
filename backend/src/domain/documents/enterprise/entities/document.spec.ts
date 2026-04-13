import { describe, it, expect } from 'vitest'
import { Document } from './document'
import { DocumentType } from '../value-objects/document-type.vo'
import { DocumentStatus } from '../value-objects/document-status.vo'
import { UniqueEntityID } from '@/core/unique-entity-id'

function makeDocument(overrides: Partial<Parameters<typeof Document.create>[0]> = {}) {
  return Document.create({
    customerId: 'customer-1',
    type: DocumentType.createUnsafe('proposal'),
    title: 'Q1 Proposal',
    driveFileId: 'file-123',
    driveViewUrl: 'https://drive.google.com/view/file-123',
    driveDownloadUrl: 'https://drive.google.com/download/file-123',
    mimeType: 'application/pdf',
    uploadedByUserId: 'user-1',
    ...overrides,
  })
}

describe('Document entity', () => {
  it('should create a document with default pending_signature status', () => {
    const doc = makeDocument()

    expect(doc.id).toBeDefined()
    expect(doc.status.value).toBe('pending_signature')
    expect(doc.title).toBe('Q1 Proposal')
    expect(doc.isDeleted).toBe(false)
  })

  it('should emit DocumentUploadedEvent on creation', () => {
    const doc = makeDocument()

    expect(doc.domainEvents).toHaveLength(1)
    expect(doc.domainEvents[0].constructor.name).toBe('DocumentUploadedEvent')
  })

  it('should not emit events when restoring from DB', () => {
    const doc = Document.restore(
      {
        customerId: 'customer-1',
        type: DocumentType.createUnsafe('contract'),
        title: 'Contract',
        driveFileId: 'file-456',
        driveViewUrl: 'https://view',
        driveDownloadUrl: 'https://download',
        mimeType: 'application/pdf',
        status: DocumentStatus.createUnsafe('signed'),
        uploadedByUserId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      new UniqueEntityID('doc-id'),
    )

    expect(doc.domainEvents).toHaveLength(0)
  })

  it('should update status to signed and set signedAt', () => {
    const doc = makeDocument()

    doc.updateStatus(DocumentStatus.createUnsafe('signed'))

    expect(doc.status.value).toBe('signed')
    expect(doc.signedAt).toBeInstanceOf(Date)
  })

  it('should update status to cancelled without setting signedAt', () => {
    const doc = makeDocument()

    doc.updateStatus(DocumentStatus.createUnsafe('cancelled'))

    expect(doc.status.value).toBe('cancelled')
    expect(doc.signedAt).toBeNull()
  })

  it('should soft delete', () => {
    const doc = makeDocument()

    doc.softDelete()

    expect(doc.isDeleted).toBe(true)
    expect(doc.deletedAt).toBeInstanceOf(Date)
  })
})
