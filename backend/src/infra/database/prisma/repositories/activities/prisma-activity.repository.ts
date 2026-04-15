import { Injectable } from '@nestjs/common'
import { IActivityRepository, FindManyActivitiesParams, PaginatedActivities } from '@/domain/activities/application/repositories/i-activity.repository'
import { Activity } from '@/domain/activities/enterprise/entities/activity'
import { PrismaService } from '../../prisma.service'
import { ActivityMapper } from '../../mappers/activities/activity.mapper'

@Injectable()
export class PrismaActivityRepository implements IActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Activity | null> {
    const raw = await this.prisma.activity.findFirst({
      where: { id, deletedAt: null },
      include: { whatsappMessages: { orderBy: { timestamp: 'asc' } } },
    })
    return raw ? ActivityMapper.toDomain(raw) : null
  }

  async findByCustomerId(customerId: string, params: FindManyActivitiesParams): Promise<PaginatedActivities> {
    const page = params.page ?? 1
    const limit = params.limit ?? 50

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      customerId,
      deletedAt: null,
      ...(params.type ? { type: params.type } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { whatsappMessages: { orderBy: { timestamp: 'asc' } } },
      }),
      this.prisma.activity.count({ where }),
    ])

    return { items: items.map(ActivityMapper.toDomain), total }
  }

  async save(activity: Activity): Promise<void> {
    const { id, ...data } = ActivityMapper.toPrisma(activity)
    await this.prisma.activity.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.activity.delete({ where: { id } })
  }
}
