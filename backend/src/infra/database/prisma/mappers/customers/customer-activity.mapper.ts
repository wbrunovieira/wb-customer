import { CustomerActivity as PrismaCustomerActivity, Prisma } from '@prisma/client'
import {
  CustomerActivity,
  CustomerActivityType,
} from '@/domain/customers/enterprise/entities/customer-activity'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class CustomerActivityMapper {
  static toDomain(raw: PrismaCustomerActivity): CustomerActivity {
    return CustomerActivity.restore(
      {
        customerId: raw.customerId,
        userId: raw.userId,
        type: raw.type as CustomerActivityType,
        description: raw.description,
        metadata: raw.metadata as Record<string, unknown> | null,
        createdAt: raw.createdAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(entity: CustomerActivity): {
    id: string
    customerId: string
    userId: string
    type: PrismaCustomerActivity['type']
    description: string
    metadata: Prisma.InputJsonValue | typeof Prisma.JsonNull
    createdAt: Date
  } {
    return {
      id: entity.id.value,
      customerId: entity.customerId,
      userId: entity.userId,
      type: entity.type as PrismaCustomerActivity['type'],
      description: entity.description,
      metadata: entity.metadata !== null && entity.metadata !== undefined
        ? (entity.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      createdAt: entity.createdAt,
    }
  }
}
