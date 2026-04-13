import { Injectable } from '@nestjs/common'
import { ICustomerUserRepository } from '@/domain/customers/application/repositories/i-customer-user.repository'
import { CustomerUser } from '@/domain/customers/enterprise/entities/customer-user'
import { PrismaService } from '../../prisma.service'
import { CustomerUserMapper } from '../../mappers/customers/customer-user.mapper'

@Injectable()
export class PrismaCustomerUserRepository implements ICustomerUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CustomerUser | null> {
    const raw = await this.prisma.customerUser.findUnique({ where: { id } })
    return raw ? CustomerUserMapper.toDomain(raw) : null
  }

  async findByUserId(userId: string): Promise<CustomerUser | null> {
    const raw = await this.prisma.customerUser.findUnique({ where: { userId } })
    return raw ? CustomerUserMapper.toDomain(raw) : null
  }

  async findByCustomerId(customerId: string): Promise<CustomerUser[]> {
    const rows = await this.prisma.customerUser.findMany({
      where: { customerId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(CustomerUserMapper.toDomain)
  }

  async save(customerUser: CustomerUser): Promise<void> {
    const { id, ...data } = CustomerUserMapper.toPrisma(customerUser)
    await this.prisma.customerUser.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    })
  }
}
