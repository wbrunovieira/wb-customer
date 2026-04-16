import { MetaConfig as PrismaMetaConfig } from '@prisma/client'
import { MetaConfig } from '@/domain/paid-traffic/enterprise/entities/meta-config'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class MetaConfigMapper {
  static toDomain(raw: PrismaMetaConfig): MetaConfig {
    return MetaConfig.restore(
      {
        appId: raw.appId,
        appSecret: raw.appSecret,
        systemUserToken: raw.systemUserToken,
        bmId: raw.bmId,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(config: MetaConfig): PrismaMetaConfig {
    return {
      id: config.id.value,
      appId: config.appId,
      appSecret: config.appSecret,
      systemUserToken: config.systemUserToken,
      bmId: config.bmId,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }
  }
}
