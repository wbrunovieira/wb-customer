import { Injectable } from '@nestjs/common'
import { IMetaConfigRepository } from '@/domain/paid-traffic/application/repositories/i-meta-config.repository'
import { MetaConfig } from '@/domain/paid-traffic/enterprise/entities/meta-config'
import { PrismaService } from '../../prisma.service'
import { MetaConfigMapper } from '../../mappers/paid-traffic/meta-config.mapper'

@Injectable()
export class PrismaMetaConfigRepository implements IMetaConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(): Promise<MetaConfig | null> {
    const raw = await this.prisma.metaConfig.findUnique({
      where: { id: 'meta-config-singleton' },
    })
    return raw ? MetaConfigMapper.toDomain(raw) : null
  }

  async save(config: MetaConfig): Promise<void> {
    const data = MetaConfigMapper.toPrisma(config)
    await this.prisma.metaConfig.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }
}
