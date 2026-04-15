import { CreativeStrategy as PrismaStrategy, CreativeStrategyItem as PrismaItem } from '@prisma/client'
import { CreativeStrategy, StrategyPhase, StrategyStatus } from '@/domain/creatives/enterprise/entities/creative-strategy'
import { CampaignObjective } from '@/domain/creatives/enterprise/entities/creative'
import { UniqueEntityID } from '@/core/unique-entity-id'

type PrismaStrategyWithItems = PrismaStrategy & { items: PrismaItem[] }

export class CreativeStrategyMapper {
  static toDomain(raw: PrismaStrategyWithItems): CreativeStrategy {
    return CreativeStrategy.restore(
      {
        customerId: raw.customerId,
        name: raw.name,
        phase: raw.phase as StrategyPhase,
        status: raw.status as StrategyStatus,
        objective: raw.objective as CampaignObjective | null,
        budget: raw.budget,
        durationDays: raw.durationDays,
        startAt: raw.startAt,
        endAt: raw.endAt,
        winnerId: raw.winnerId,
        parentStrategyId: raw.parentStrategyId,
        notes: raw.notes,
        items: raw.items.map((i) => ({ creativeId: i.creativeId, position: i.position })),
        createdByUserId: raw.createdByUserId,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(strategy: CreativeStrategy): Omit<PrismaStrategy, 'items'> {
    return {
      id: strategy.id.value,
      customerId: strategy.customerId,
      name: strategy.name,
      phase: strategy.phase as PrismaStrategy['phase'],
      status: strategy.status as PrismaStrategy['status'],
      objective: strategy.objective as PrismaStrategy['objective'],
      budget: strategy.budget,
      durationDays: strategy.durationDays,
      startAt: strategy.startAt,
      endAt: strategy.endAt,
      winnerId: strategy.winnerId,
      parentStrategyId: strategy.parentStrategyId,
      notes: strategy.notes,
      createdByUserId: strategy.createdByUserId,
      createdAt: strategy.createdAt,
      updatedAt: strategy.updatedAt,
    }
  }
}
