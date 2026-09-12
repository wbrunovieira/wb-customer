import { Injectable } from '@nestjs/common'
import {
  ISocialAttributionLinkRepository,
  SocialAttributionLinkRecord,
  StoredAttributionLink,
} from '@/domain/social/application/repositories/i-social-attribution-link.repository'
import { PrismaService } from '../../prisma.service'

@Injectable()
export class PrismaSocialAttributionLinkRepository
  implements ISocialAttributionLinkRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(record: SocialAttributionLinkRecord): Promise<string> {
    const created = await this.prisma.socialAttributionLink.create({
      data: {
        code: record.code,
        source: record.source,
        customerId: record.customerId,
        postRef: record.postRef ?? null,
        destinationPhone: record.destinationPhone,
        prefilledMessage: record.prefilledMessage,
        createdByUserId: record.createdByUserId,
      },
    })
    return created.id
  }

  async findByCode(code: string): Promise<StoredAttributionLink | null> {
    const raw = await this.prisma.socialAttributionLink.findFirst({
      where: { code, deletedAt: null },
    })
    return raw ? this.toRecord(raw) : null
  }

  async findByCustomerId(customerId: string): Promise<StoredAttributionLink[]> {
    const raws = await this.prisma.socialAttributionLink.findMany({
      where: { customerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    return raws.map((r) => this.toRecord(r))
  }

  private toRecord(raw: {
    id: string
    code: string
    source: string
    customerId: string
    postRef: string | null
    destinationPhone: string
    prefilledMessage: string
    createdByUserId: string
    createdAt: Date
  }): StoredAttributionLink {
    return {
      id: raw.id,
      code: raw.code,
      source: raw.source,
      customerId: raw.customerId,
      postRef: raw.postRef,
      destinationPhone: raw.destinationPhone,
      prefilledMessage: raw.prefilledMessage,
      createdByUserId: raw.createdByUserId,
      createdAt: raw.createdAt,
    }
  }
}
