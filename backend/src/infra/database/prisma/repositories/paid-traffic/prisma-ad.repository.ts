import { Injectable } from '@nestjs/common'
import { IAdRepository } from '@/domain/paid-traffic/application/repositories/i-ad.repository'
import { Ad } from '@/domain/paid-traffic/enterprise/entities/ad'
import { PrismaService } from '../../prisma.service'
import { AdMapper } from '../../mappers/paid-traffic/ad.mapper'

@Injectable()
export class PrismaAdRepository implements IAdRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Ad | null> {
    const raw = await this.prisma.ad.findUnique({ where: { id } })
    return raw ? AdMapper.toDomain(raw) : null
  }

  async findByAdSetId(adSetId: string): Promise<Ad[]> {
    const raws = await this.prisma.ad.findMany({
      where: { adSetId },
      orderBy: { createdAt: 'asc' },
    })
    return raws.map(AdMapper.toDomain)
  }

  async save(ad: Ad): Promise<void> {
    const data = AdMapper.toPrisma(ad)
    await this.prisma.ad.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.ad.delete({ where: { id } })
  }
}
