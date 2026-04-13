import { MeetingType as PrismaMeetingType } from '@prisma/client'
import { MeetingType } from '@/domain/meetings/enterprise/entities/meeting-type'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class MeetingTypeMapper {
  static toDomain(raw: PrismaMeetingType): MeetingType {
    return MeetingType.restore(
      {
        name: raw.name,
        description: raw.description,
        durationMinutes: raw.durationMinutes,
        color: raw.color,
        isActive: raw.isActive,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        deletedAt: raw.deletedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(type: MeetingType): PrismaMeetingType {
    return {
      id: type.id.value,
      name: type.name,
      description: type.description,
      durationMinutes: type.durationMinutes,
      color: type.color,
      isActive: type.isActive,
      createdAt: type.createdAt,
      updatedAt: type.updatedAt,
      deletedAt: type.deletedAt,
    }
  }
}
