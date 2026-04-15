import { UniqueEntityID } from '@/core/unique-entity-id'
import { Creative, CreativeType, CreativeStatus, CampaignObjective } from '../../../enterprise/entities/creative'
import { CreativeStrategy, StrategyPhase, StrategyStatus } from '../../../enterprise/entities/creative-strategy'

// ── Customer stub (minimal shape used by in-memory repo) ──────────────────

export interface CustomerStub {
  id: UniqueEntityID
  name: string
  driveFolderId: string | null
}

export function makeCustomer(overrides: Partial<{ id: string; name: string }> = {}): CustomerStub {
  return {
    id: new UniqueEntityID(overrides.id ?? 'customer-1'),
    name: overrides.name ?? 'Test Company',
    driveFolderId: null,
  }
}

// ── Creative factory ──────────────────────────────────────────────────────

export function makeCreative(
  overrides: Partial<{
    customerId: string
    title: string
    caption: string | null
    designDescription: string | null
    type: CreativeType
    objective: CampaignObjective | null
    status: CreativeStatus
  }> = {},
  id?: string,
): Creative {
  return Creative.create(
    {
      customerId: overrides.customerId ?? 'customer-1',
      title: overrides.title ?? 'Test Creative',
      caption: overrides.caption ?? null,
      designDescription: overrides.designDescription ?? null,
      type: overrides.type ?? 'image',
      objective: overrides.objective ?? null,
      status: overrides.status ?? 'draft',
      createdByUserId: 'user-1',
    },
    id ? new UniqueEntityID(id) : undefined,
  )
}

// ── CreativeStrategy factory ──────────────────────────────────────────────

export function makeStrategy(
  overrides: Partial<{
    customerId: string
    name: string
    phase: StrategyPhase
    status: StrategyStatus
    budget: number | null
    winnerId: string | null
    parentStrategyId: string | null
  }> = {},
  id?: string,
): CreativeStrategy {
  return CreativeStrategy.create(
    {
      customerId: overrides.customerId ?? 'customer-1',
      name: overrides.name ?? 'Test Strategy',
      phase: overrides.phase ?? 'exploration',
      status: overrides.status ?? 'active',
      budget: overrides.budget ?? null,
      winnerId: overrides.winnerId ?? null,
      parentStrategyId: overrides.parentStrategyId ?? null,
      items: [],
      createdByUserId: 'user-1',
    },
    id ? new UniqueEntityID(id) : undefined,
  )
}
