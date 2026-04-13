import { Injectable } from '@nestjs/common'
import {
  ICustomerRepository,
  FindManyCustomersParams,
  PaginatedCustomers,
  CustomerEmployee,
} from '@/domain/customers/application/repositories/i-customer.repository'
import { Customer } from '@/domain/customers/enterprise/entities/customer'
import { PrismaService } from '../../prisma.service'
import { CustomerMapper } from '../../mappers/customers/customer.mapper'
import { Prisma } from '@prisma/client'

@Injectable()
export class PrismaCustomerRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Customer | null> {
    const raw = await this.prisma.customer.findUnique({
      where: { id, deletedAt: null },
    })
    return raw ? CustomerMapper.toDomain(raw) : null
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const raw = await this.prisma.customer.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    })
    return raw ? CustomerMapper.toDomain(raw) : null
  }

  async findMany(params: FindManyCustomersParams): Promise<PaginatedCustomers> {
    const page = params.page ?? 1
    const limit = params.limit ?? 20

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(params.status ? { status: params.status as Prisma.EnumCustomerStatusFilter } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(params.employeeId
        ? { employees: { some: { userId: params.employeeId } } }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ])

    return { items: items.map(CustomerMapper.toDomain), total }
  }

  async save(customer: Customer): Promise<void> {
    const data = CustomerMapper.toPrisma(customer)
    await this.prisma.customer.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }

  async assignEmployee(
    customerId: string,
    userId: string,
    assignedBy: string,
  ): Promise<void> {
    await this.prisma.customerEmployee.create({
      data: { customerId, userId, assignedBy },
    })
  }

  async removeEmployee(customerId: string, userId: string): Promise<void> {
    await this.prisma.customerEmployee.delete({
      where: { customerId_userId: { customerId, userId } },
    })
  }

  async findEmployees(customerId: string): Promise<CustomerEmployee[]> {
    const raws = await this.prisma.customerEmployee.findMany({
      where: { customerId },
    })
    return raws.map((r) => ({
      userId: r.userId,
      assignedAt: r.assignedAt,
      assignedBy: r.assignedBy,
    }))
  }

  async isEmployeeAssigned(customerId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.customerEmployee.count({
      where: { customerId, userId },
    })
    return count > 0
  }
}
