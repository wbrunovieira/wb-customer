import { Injectable } from '@nestjs/common'
import {
  ICreativeRepository,
  FindManyCreativesParams,
  PaginatedCreatives,
} from '@/domain/creatives/application/repositories/i-creative.repository'
import { Creative } from '@/domain/creatives/enterprise/entities/creative'
import { PrismaService } from '../../prisma.service'
import { CreativeMapper } from '../../mappers/creatives/creative.mapper'
import { Prisma } from '@prisma/client'

@Injectable()
export class PrismaCreativeRepository implements ICreativeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Creative | null> {
    const raw = await this.prisma.creative.findUnique({ where: { id } })
    return raw ? CreativeMapper.toDomain(raw) : null
  }

  async findByCustomerId(
    customerId: string,
    params: FindManyCreativesParams = {},
  ): Promise<PaginatedCreatives> {
    const page = params.page ?? 1
    const limit = params.limit ?? 20

    const where: Prisma.CreativeWhereInput = {
      customerId,
      deletedAt: null,
      ...(params.type ? { type: params.type } : {}),
      ...(params.status ? { status: params.status } : {}),
    }

    const [raws, total] = await Promise.all([
      this.prisma.creative.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.creative.count({ where }),
    ])

    return { items: raws.map(CreativeMapper.toDomain), total }
  }

  async save(creative: Creative): Promise<void> {
    const data = CreativeMapper.toPrisma(creative)
    await this.prisma.creative.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.creative.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }
}
