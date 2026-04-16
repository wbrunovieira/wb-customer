import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import {
  ICampaignRepository,
  FindManyCampaignsParams,
  PaginatedCampaigns,
} from '@/domain/paid-traffic/application/repositories/i-campaign.repository'
import { Campaign } from '@/domain/paid-traffic/enterprise/entities/campaign'
import { PrismaService } from '../../prisma.service'
import { CampaignMapper } from '../../mappers/paid-traffic/campaign.mapper'

@Injectable()
export class PrismaCampaignRepository implements ICampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Campaign | null> {
    const raw = await this.prisma.campaign.findUnique({ where: { id } })
    return raw ? CampaignMapper.toDomain(raw) : null
  }

  async findByCustomerId(
    customerId: string,
    params: FindManyCampaignsParams = {},
  ): Promise<PaginatedCampaigns> {
    const page = params.page ?? 1
    const limit = params.limit ?? 20

    const where: Prisma.CampaignWhereInput = {
      customerId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.publishStatus ? { publishStatus: params.publishStatus } : {}),
    }

    const [raws, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campaign.count({ where }),
    ])

    return { items: raws.map(CampaignMapper.toDomain), total }
  }

  async save(campaign: Campaign): Promise<void> {
    const data = CampaignMapper.toPrisma(campaign)
    await this.prisma.campaign.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }

  async findAllPublished(): Promise<Campaign[]> {
    const raws = await this.prisma.campaign.findMany({
      where: { publishStatus: 'published' },
      orderBy: { createdAt: 'desc' },
    })
    return raws.map(CampaignMapper.toDomain)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.campaign.delete({ where: { id } })
  }
}
