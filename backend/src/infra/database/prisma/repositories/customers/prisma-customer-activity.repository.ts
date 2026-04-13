import { Injectable } from '@nestjs/common'
import {
  ICustomerActivityRepository,
  FindCustomerActivitiesParams,
  PaginatedActivities,
} from '@/domain/customers/application/repositories/i-customer-activity.repository'
import { CustomerActivity } from '@/domain/customers/enterprise/entities/customer-activity'
import { PrismaService } from '../../prisma.service'
import { CustomerActivityMapper } from '../../mappers/customers/customer-activity.mapper'

@Injectable()
export class PrismaCustomerActivityRepository
  implements ICustomerActivityRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findByCustomerId(
    customerId: string,
    params?: FindCustomerActivitiesParams,
  ): Promise<PaginatedActivities> {
    const page = params?.page ?? 1
    const limit = params?.limit ?? 20

    const [items, total] = await Promise.all([
      this.prisma.customerActivity.findMany({
        where: { customerId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customerActivity.count({ where: { customerId } }),
    ])

    return { items: items.map(CustomerActivityMapper.toDomain), total }
  }

  async save(activity: CustomerActivity): Promise<void> {
    const { id, ...data } = CustomerActivityMapper.toPrisma(activity)
    await this.prisma.customerActivity.create({ data: { id, ...data } })
  }
}
