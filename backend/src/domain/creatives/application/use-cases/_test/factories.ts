import { UniqueEntityID } from '@/core/unique-entity-id'
import { Customer } from '@/domain/customers/enterprise/entities/customer'
import { Creative, CreativeType, CreativeStatus, CampaignObjective } from '../../../enterprise/entities/creative'
import { CreativeStrategy, StrategyPhase, StrategyStatus } from '../../../enterprise/entities/creative-strategy'

// ── Customer factory ──────────────────────────────────────────────────────

export function makeCustomer(
  overrides: Partial<{ id: string; name: string; email: string }> = {},
): Customer {
  return Customer.create(
    {
      name: overrides.name ?? 'Test Company',
      email: overrides.email ?? 'test@company.com',
      createdByUserId: 'user-1',
    },
    overrides.id ? new UniqueEntityID(overrides.id) : new UniqueEntityID('customer-1'),
  )
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
