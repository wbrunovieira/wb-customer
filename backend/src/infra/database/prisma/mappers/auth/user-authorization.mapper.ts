import { UserAuthorization as PrismaUserAuthorization } from '@prisma/client'
import { UserAuthorization } from '@/domain/auth/enterprise/entities/user-authorization'
import { UserRole } from '@/domain/auth/enterprise/value-objects/user-role.vo'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class UserAuthorizationMapper {
  static toDomain(raw: PrismaUserAuthorization): UserAuthorization {
    return UserAuthorization.restore(
      {
        userId: raw.userId,
        role: UserRole.createUnsafe(raw.role),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(entity: UserAuthorization): PrismaUserAuthorization {
    return {
      id: entity.id.value,
      userId: entity.userId,
      role: entity.role.value as PrismaUserAuthorization['role'],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }
  }
}
