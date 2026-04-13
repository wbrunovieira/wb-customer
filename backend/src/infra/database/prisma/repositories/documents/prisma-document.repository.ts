import { Injectable } from '@nestjs/common'
import {
  IDocumentRepository,
  FindManyDocumentsParams,
  PaginatedDocuments,
} from '@/domain/documents/application/repositories/i-document.repository'
import { Document } from '@/domain/documents/enterprise/entities/document'
import { PrismaService } from '../../prisma.service'
import { DocumentMapper } from '../../mappers/documents/document.mapper'
import { Prisma } from '@prisma/client'

@Injectable()
export class PrismaDocumentRepository implements IDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Document | null> {
    const raw = await this.prisma.document.findUnique({
      where: { id },
    })
    return raw ? DocumentMapper.toDomain(raw) : null
  }

  async findByCustomerId(
    customerId: string,
    params: FindManyDocumentsParams,
  ): Promise<PaginatedDocuments> {
    const page = params.page ?? 1
    const limit = params.limit ?? 20

    const where: Prisma.DocumentWhereInput = {
      customerId,
      deletedAt: null,
      ...(params.type ? { type: params.type as Prisma.EnumDocumentTypeFilter } : {}),
      ...(params.status ? { status: params.status as Prisma.EnumDocumentStatusFilter } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.document.count({ where }),
    ])

    return { items: items.map(DocumentMapper.toDomain), total }
  }

  async save(document: Document): Promise<void> {
    const data = DocumentMapper.toPrisma(document)
    await this.prisma.document.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }
}
