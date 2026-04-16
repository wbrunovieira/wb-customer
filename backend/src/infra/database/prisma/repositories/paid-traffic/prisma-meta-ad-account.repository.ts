import { Injectable } from '@nestjs/common'
import { IMetaAdAccountRepository } from '@/domain/paid-traffic/application/repositories/i-meta-ad-account.repository'
import { MetaAdAccount } from '@/domain/paid-traffic/enterprise/entities/meta-ad-account'
import { PrismaService } from '../../prisma.service'
import { MetaAdAccountMapper } from '../../mappers/paid-traffic/meta-ad-account.mapper'

@Injectable()
export class PrismaMetaAdAccountRepository implements IMetaAdAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCustomerId(customerId: string): Promise<MetaAdAccount | null> {
    const raw = await this.prisma.metaAdAccount.findUnique({ where: { customerId } })
    return raw ? MetaAdAccountMapper.toDomain(raw) : null
  }

  async save(account: MetaAdAccount): Promise<void> {
    const data = MetaAdAccountMapper.toPrisma(account)
    await this.prisma.metaAdAccount.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }
}
