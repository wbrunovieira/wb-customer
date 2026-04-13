import { Contact as PrismaContact } from '@prisma/client'
import { Contact } from '@/domain/customers/enterprise/entities/contact'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class ContactMapper {
  static toDomain(raw: PrismaContact): Contact {
    return Contact.restore(
      {
        customerId: raw.customerId,
        name: raw.name,
        email: raw.email,
        phone: raw.phone,
        role: raw.role,
        isPrimary: raw.isPrimary,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(entity: Contact): PrismaContact {
    return {
      id: entity.id.value,
      customerId: entity.customerId,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      role: entity.role,
      isPrimary: entity.isPrimary,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }
  }
}
