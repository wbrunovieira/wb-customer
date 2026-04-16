import { MetaAdAccount as PrismaMetaAdAccount } from '@prisma/client'
import { MetaAdAccount } from '@/domain/paid-traffic/enterprise/entities/meta-ad-account'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class MetaAdAccountMapper {
  static toDomain(raw: PrismaMetaAdAccount): MetaAdAccount {
    return MetaAdAccount.restore(
      {
        customerId: raw.customerId,
        adAccountId: raw.adAccountId,
        pageId: raw.pageId,
        pixelId: raw.pixelId,
        instagramActorId: raw.instagramActorId,
        accountName: raw.accountName,
        isActive: raw.isActive,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(account: MetaAdAccount): PrismaMetaAdAccount {
    return {
      id: account.id.value,
      customerId: account.customerId,
      adAccountId: account.adAccountId,
      pageId: account.pageId,
      pixelId: account.pixelId,
      instagramActorId: account.instagramActorId,
      accountName: account.accountName,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }
  }
}
