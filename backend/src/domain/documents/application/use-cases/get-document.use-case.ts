import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IDocumentRepository } from '../repositories/i-document.repository'
import { Document } from '../../enterprise/entities/document'
import { DocumentNotFoundError } from '../../domain/exceptions/document-not-found.error'

export interface GetDocumentRequest {
  customerId: string
  documentId: string
}

export interface GetDocumentResponse {
  document: Document
}

export type GetDocumentResult = Either<DocumentNotFoundError, GetDocumentResponse>

@Injectable()
export class GetDocumentUseCase {
  constructor(private readonly documentRepo: IDocumentRepository) {}

  async execute(request: GetDocumentRequest): Promise<GetDocumentResult> {
    const document = await this.documentRepo.findById(request.documentId)

    if (!document || document.customerId !== request.customerId || document.isDeleted) {
      return left(new DocumentNotFoundError(request.documentId))
    }

    return right({ document })
  }
}
