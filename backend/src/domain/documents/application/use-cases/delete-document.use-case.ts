import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IDocumentRepository } from '../repositories/i-document.repository'
import { IStorageAdapter } from '../services/i-storage.adapter'
import { DocumentNotFoundError } from '../../domain/exceptions/document-not-found.error'

export interface DeleteDocumentRequest {
  customerId: string
  documentId: string
}

export type DeleteDocumentResult = Either<DocumentNotFoundError, void>

@Injectable()
export class DeleteDocumentUseCase {
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly storageAdapter: IStorageAdapter,
  ) {}

  async execute(request: DeleteDocumentRequest): Promise<DeleteDocumentResult> {
    const document = await this.documentRepo.findById(request.documentId)

    if (!document || document.customerId !== request.customerId || document.isDeleted) {
      return left(new DocumentNotFoundError(request.documentId))
    }

    await this.storageAdapter.deleteFile(document.driveFileId)
    await this.documentRepo.softDelete(document.id.value)

    return right(undefined)
  }
}
