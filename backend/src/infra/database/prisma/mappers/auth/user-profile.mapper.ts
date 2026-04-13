import { UserProfile as PrismaUserProfile } from '@prisma/client'
import { UserProfile } from '@/domain/auth/enterprise/entities/user-profile'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class UserProfileMapper {
  static toDomain(raw: PrismaUserProfile): UserProfile {
    return UserProfile.restore(
      {
        userId: raw.userId,
        name: raw.name,
        phone: raw.phone,
        avatarUrl: raw.avatarUrl,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(entity: UserProfile): PrismaUserProfile {
    return {
      id: entity.id.value,
      userId: entity.userId,
      name: entity.name,
      phone: entity.phone,
      avatarUrl: entity.avatarUrl,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }
  }
}
