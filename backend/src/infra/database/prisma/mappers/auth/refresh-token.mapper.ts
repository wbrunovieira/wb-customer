import { RefreshToken as PrismaRefreshToken } from '@prisma/client'
import { RefreshToken } from '@/domain/auth/enterprise/entities/refresh-token'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class RefreshTokenMapper {
  static toDomain(raw: PrismaRefreshToken): RefreshToken {
    return RefreshToken.restore(
      {
        userId: raw.userId,
        token: raw.token,
        expiresAt: raw.expiresAt,
        revokedAt: raw.revokedAt,
        createdAt: raw.createdAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(entity: RefreshToken): PrismaRefreshToken {
    return {
      id: entity.id.value,
      userId: entity.userId,
      token: entity.token,
      expiresAt: entity.expiresAt,
      revokedAt: entity.revokedAt,
      createdAt: entity.createdAt,
    }
  }
}
