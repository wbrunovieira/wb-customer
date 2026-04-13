import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IDocumentRepository } from '../repositories/i-document.repository'
import { IStorageAdapter } from '../services/i-storage.adapter'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { ICustomerActivityRepository } from '@/domain/customers/application/repositories/i-customer-activity.repository'
import { Document } from '../../enterprise/entities/document'
import { DocumentType } from '../../enterprise/value-objects/document-type.vo'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { InvalidDocumentTypeError } from '../../domain/exceptions/invalid-document-type.error'
import { CustomerActivity } from '@/domain/customers/enterprise/entities/customer-activity'

export interface UploadDocumentRequest {
  customerId: string
  type: string
  title: string
  mimeType: string
  sizeBytes?: number
  notes?: string
  uploadedByUserId: string
  buffer: Buffer
}

export interface UploadDocumentResponse {
  documentId: string
}

export type UploadDocumentResult = Either<
  CustomerNotFoundError | InvalidDocumentTypeError,
  UploadDocumentResponse
>

@Injectable()
export class UploadDocumentUseCase {
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly storageAdapter: IStorageAdapter,
    private readonly customerRepo: ICustomerRepository,
    private readonly activityRepo: ICustomerActivityRepository,
  ) {}

  async execute(request: UploadDocumentRequest): Promise<UploadDocumentResult> {
    const customer = await this.customerRepo.findById(request.customerId)
    if (!customer) {
      return left(new CustomerNotFoundError(request.customerId))
    }

    const typeResult = DocumentType.create(request.type)
    if (typeResult.isLeft()) {
      return left(typeResult.value)
    }
    const docType = typeResult.value

    const folderId = customer.driveFolderId ?? request.customerId
    const uploaded = await this.storageAdapter.uploadFile({
      folderId,
      fileName: request.title,
      mimeType: request.mimeType,
      buffer: request.buffer,
    })

    const document = Document.create({
      customerId: request.customerId,
      type: docType,
      title: request.title,
      driveFileId: uploaded.fileId,
      driveViewUrl: uploaded.viewUrl,
      driveDownloadUrl: uploaded.downloadUrl,
      mimeType: request.mimeType,
      sizeBytes: request.sizeBytes,
      notes: request.notes,
      uploadedByUserId: request.uploadedByUserId,
    })

    await this.documentRepo.save(document)

    await this.activityRepo.save(
      CustomerActivity.create({
        customerId: request.customerId,
        userId: request.uploadedByUserId,
        type: 'document_uploaded',
        description: `Document "${request.title}" uploaded`,
        metadata: { documentId: document.id.value, type: request.type },
      }),
    )

    return right({ documentId: document.id.value })
  }
}
