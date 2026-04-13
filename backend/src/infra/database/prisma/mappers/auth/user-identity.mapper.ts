import { UserIdentity as PrismaUserIdentity } from '@prisma/client'
import { UserIdentity } from '@/domain/auth/enterprise/entities/user-identity'
import { Email } from '@/domain/auth/enterprise/value-objects/email.vo'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class UserIdentityMapper {
  static toDomain(raw: PrismaUserIdentity): UserIdentity {
    return UserIdentity.restore(
      {
        email: Email.createUnsafe(raw.email),
        passwordHash: raw.passwordHash,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        deletedAt: raw.deletedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(entity: UserIdentity): PrismaUserIdentity {
    return {
      id: entity.id.value,
      email: entity.email.value,
      passwordHash: entity.passwordHash,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    }
  }
}
