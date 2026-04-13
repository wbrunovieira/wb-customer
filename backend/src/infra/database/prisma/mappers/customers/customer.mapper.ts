import { Customer as PrismaCustomer } from '@prisma/client'
import { Customer } from '@/domain/customers/enterprise/entities/customer'
import { CustomerStatus } from '@/domain/customers/enterprise/value-objects/customer-status.vo'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class CustomerMapper {
  static toDomain(raw: PrismaCustomer): Customer {
    return Customer.restore(
      {
        name: raw.name,
        email: raw.email,
        phone: raw.phone,
        document: raw.document,
        website: raw.website,
        notes: raw.notes,
        status: CustomerStatus.createUnsafe(raw.status),
        categoryId: raw.categoryId,
        driveFolderId: raw.driveFolderId,
        createdByUserId: raw.createdByUserId,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        deletedAt: raw.deletedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(entity: Customer): PrismaCustomer {
    return {
      id: entity.id.value,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      document: entity.document,
      website: entity.website,
      notes: entity.notes,
      status: entity.status.value as PrismaCustomer['status'],
      categoryId: entity.categoryId,
      driveFolderId: entity.driveFolderId,
      createdByUserId: entity.createdByUserId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    }
  }
}
