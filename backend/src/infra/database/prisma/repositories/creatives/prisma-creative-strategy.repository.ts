import { Injectable } from '@nestjs/common'
import {
  ICreativeStrategyRepository,
  FindManyStrategiesParams,
  PaginatedStrategies,
} from '@/domain/creatives/application/repositories/i-creative-strategy.repository'
import { CreativeStrategy } from '@/domain/creatives/enterprise/entities/creative-strategy'
import { PrismaService } from '../../prisma.service'
import { CreativeStrategyMapper } from '../../mappers/creatives/creative-strategy.mapper'
import { Prisma } from '@prisma/client'

@Injectable()
export class PrismaCreativeStrategyRepository implements ICreativeStrategyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CreativeStrategy | null> {
    const raw = await this.prisma.creativeStrategy.findUnique({
      where: { id },
      include: { items: { orderBy: { position: 'asc' } } },
    })
    return raw ? CreativeStrategyMapper.toDomain(raw) : null
  }

  async findByCustomerId(
    customerId: string,
    params: FindManyStrategiesParams = {},
  ): Promise<PaginatedStrategies> {
    const page = params.page ?? 1
    const limit = params.limit ?? 20

    const where: Prisma.CreativeStrategyWhereInput = {
      customerId,
      ...(params.phase ? { phase: params.phase } : {}),
      ...(params.status ? { status: params.status } : {}),
    }

    const [raws, total] = await Promise.all([
      this.prisma.creativeStrategy.findMany({
        where,
        include: { items: { orderBy: { position: 'asc' } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.creativeStrategy.count({ where }),
    ])

    return { items: raws.map(CreativeStrategyMapper.toDomain), total }
  }

  async save(strategy: CreativeStrategy): Promise<void> {
    const data = CreativeStrategyMapper.toPrisma(strategy)

    await this.prisma.$transaction(async (tx) => {
      await tx.creativeStrategy.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      })

      // Sync strategy items — replace all
      await tx.creativeStrategyItem.deleteMany({ where: { strategyId: data.id } })
      if (strategy.items.length > 0) {
        await tx.creativeStrategyItem.createMany({
          data: strategy.items.map((item) => ({
            strategyId: data.id,
            creativeId: item.creativeId,
            position: item.position,
          })),
        })
      }
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.creativeStrategy.delete({ where: { id } })
  }
}
