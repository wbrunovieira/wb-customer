import { Document } from '../../enterprise/entities/document'

export interface FindManyDocumentsParams {
  type?: string
  status?: string
  page?: number
  limit?: number
}

export interface PaginatedDocuments {
  items: Document[]
  total: number
}

export abstract class IDocumentRepository {
  abstract findById(id: string): Promise<Document | null>
  abstract findByCustomerId(
    customerId: string,
    params: FindManyDocumentsParams,
  ): Promise<PaginatedDocuments>
  abstract save(document: Document): Promise<void>
  abstract softDelete(id: string): Promise<void>
}
