import { CustomerCategory as PrismaCustomerCategory } from '@prisma/client'
import { CustomerCategory } from '@/domain/customers/enterprise/entities/customer-category'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class CustomerCategoryMapper {
  static toDomain(raw: PrismaCustomerCategory): CustomerCategory {
    return CustomerCategory.restore(
      {
        name: raw.name,
        description: raw.description,
        isActive: raw.isActive,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        deletedAt: raw.deletedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(entity: CustomerCategory): PrismaCustomerCategory {
    return {
      id: entity.id.value,
      name: entity.name,
      description: entity.description,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    }
  }
}
