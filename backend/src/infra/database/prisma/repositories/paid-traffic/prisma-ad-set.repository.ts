import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { IAdSetRepository } from '@/domain/paid-traffic/application/repositories/i-ad-set.repository'
import { AdSet } from '@/domain/paid-traffic/enterprise/entities/ad-set'
import { PrismaService } from '../../prisma.service'
import { AdSetMapper } from '../../mappers/paid-traffic/ad-set.mapper'

@Injectable()
export class PrismaAdSetRepository implements IAdSetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<AdSet | null> {
    const raw = await this.prisma.adSet.findUnique({ where: { id } })
    return raw ? AdSetMapper.toDomain(raw) : null
  }

  async findByCampaignId(campaignId: string): Promise<AdSet[]> {
    const raws = await this.prisma.adSet.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'asc' },
    })
    return raws.map(AdSetMapper.toDomain)
  }

  async save(adSet: AdSet): Promise<void> {
    const data = AdSetMapper.toPrisma(adSet)
    const targeting = data.targeting === null ? Prisma.JsonNull : (data.targeting as Prisma.InputJsonValue)
    await this.prisma.adSet.upsert({
      where: { id: data.id },
      create: { ...data, targeting },
      update: { ...data, targeting },
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.adSet.delete({ where: { id } })
  }
}
