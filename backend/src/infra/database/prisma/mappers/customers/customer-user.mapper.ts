import { CustomerUser as PrismaCustomerUser } from '@prisma/client'
import { CustomerUser, CustomerUserRole } from '@/domain/customers/enterprise/entities/customer-user'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class CustomerUserMapper {
  static toDomain(raw: PrismaCustomerUser): CustomerUser {
    return CustomerUser.restore(
      {
        userId: raw.userId,
        customerId: raw.customerId,
        customerRole: raw.customerRole as CustomerUserRole,
        createdBy: raw.createdBy,
        createdAt: raw.createdAt,
        deletedAt: raw.deletedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(cu: CustomerUser): PrismaCustomerUser {
    return {
      id: cu.id.value,
      userId: cu.userId,
      customerId: cu.customerId,
      customerRole: cu.customerRole as PrismaCustomerUser['customerRole'],
      createdBy: cu.createdBy,
      createdAt: cu.createdAt,
      deletedAt: cu.deletedAt,
    }
  }
}
