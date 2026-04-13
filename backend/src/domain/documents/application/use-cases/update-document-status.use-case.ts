import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IDocumentRepository } from '../repositories/i-document.repository'
import { DocumentStatus } from '../../enterprise/value-objects/document-status.vo'
import { DocumentNotFoundError } from '../../domain/exceptions/document-not-found.error'
import { InvalidDocumentStatusError } from '../../domain/exceptions/invalid-document-status.error'

export interface UpdateDocumentStatusRequest {
  customerId: string
  documentId: string
  status: string
}

export type UpdateDocumentStatusResult = Either<
  DocumentNotFoundError | InvalidDocumentStatusError,
  void
>

@Injectable()
export class UpdateDocumentStatusUseCase {
  constructor(private readonly documentRepo: IDocumentRepository) {}

  async execute(request: UpdateDocumentStatusRequest): Promise<UpdateDocumentStatusResult> {
    const document = await this.documentRepo.findById(request.documentId)

    if (!document || document.customerId !== request.customerId || document.isDeleted) {
      return left(new DocumentNotFoundError(request.documentId))
    }

    const statusResult = DocumentStatus.create(request.status)
    if (statusResult.isLeft()) {
      return left(statusResult.value)
    }

    document.updateStatus(statusResult.value)
    await this.documentRepo.save(document)

    return right(undefined)
  }
}
