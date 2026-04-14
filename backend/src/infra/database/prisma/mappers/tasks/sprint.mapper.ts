import { Sprint as PrismaSprint } from '@prisma/client'
import { Sprint } from '@/domain/tasks/enterprise/entities/sprint'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class SprintMapper {
  static toDomain(raw: PrismaSprint): Sprint {
    return Sprint.restore({
      customerId: raw.customerId,
      name: raw.name,
      startAt: raw.startAt,
      endAt: raw.endAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    }, new UniqueEntityID(raw.id))
  }

  static toPrisma(sprint: Sprint) {
    return {
      id: sprint.id.value,
      customerId: sprint.customerId,
      name: sprint.name,
      startAt: sprint.startAt,
      endAt: sprint.endAt,
      createdAt: sprint.createdAt,
      updatedAt: sprint.updatedAt,
    }
  }
}
