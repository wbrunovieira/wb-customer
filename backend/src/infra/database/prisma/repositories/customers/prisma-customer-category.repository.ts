import { Injectable } from '@nestjs/common'
import { ICustomerCategoryRepository } from '@/domain/customers/application/repositories/i-customer-category.repository'
import { CustomerCategory } from '@/domain/customers/enterprise/entities/customer-category'
import { PrismaService } from '../../prisma.service'
import { CustomerCategoryMapper } from '../../mappers/customers/customer-category.mapper'

@Injectable()
export class PrismaCustomerCategoryRepository
  implements ICustomerCategoryRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CustomerCategory | null> {
    const raw = await this.prisma.customerCategory.findUnique({
      where: { id, deletedAt: null },
    })
    return raw ? CustomerCategoryMapper.toDomain(raw) : null
  }

  async findByName(name: string): Promise<CustomerCategory | null> {
    const raw = await this.prisma.customerCategory.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null },
    })
    return raw ? CustomerCategoryMapper.toDomain(raw) : null
  }

  async findAll(onlyActive?: boolean): Promise<CustomerCategory[]> {
    const raws = await this.prisma.customerCategory.findMany({
      where: {
        deletedAt: null,
        ...(onlyActive !== undefined ? { isActive: onlyActive } : {}),
      },
      orderBy: { name: 'asc' },
    })
    return raws.map(CustomerCategoryMapper.toDomain)
  }

  async save(category: CustomerCategory): Promise<void> {
    const data = CustomerCategoryMapper.toPrisma(category)
    await this.prisma.customerCategory.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }
}
