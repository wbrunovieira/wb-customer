import {
  IDocumentRepository,
  FindManyDocumentsParams,
  PaginatedDocuments,
} from '@/domain/documents/application/repositories/i-document.repository'
import { Document } from '@/domain/documents/enterprise/entities/document'

export class InMemoryDocumentRepository implements IDocumentRepository {
  public items: Document[] = []

  async findById(id: string): Promise<Document | null> {
    return this.items.find((d) => d.id.value === id && !d.isDeleted) ?? null
  }

  async findByCustomerId(
    customerId: string,
    params: FindManyDocumentsParams,
  ): Promise<PaginatedDocuments> {
    let filtered = this.items.filter((d) => d.customerId === customerId && !d.isDeleted)

    if (params.type) {
      filtered = filtered.filter((d) => d.type.value === params.type)
    }

    if (params.status) {
      filtered = filtered.filter((d) => d.status.value === params.status)
    }

    const total = filtered.length
    const page = params.page ?? 1
    const limit = params.limit ?? 20
    const items = filtered.slice((page - 1) * limit, page * limit)

    return { items, total }
  }

  async save(document: Document): Promise<void> {
    const index = this.items.findIndex((d) => d.id.equals(document.id))
    if (index >= 0) {
      this.items[index] = document
    } else {
      this.items.push(document)
    }
  }

  async softDelete(id: string): Promise<void> {
    const doc = this.items.find((d) => d.id.value === id)
    if (doc) doc.softDelete()
  }
}
