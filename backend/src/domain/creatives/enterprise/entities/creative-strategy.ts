import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { CampaignObjective } from './creative'

export type StrategyPhase = 'exploration' | 'refinement'
export type StrategyStatus = 'active' | 'completed' | 'paused'

export const STRATEGY_PHASES: StrategyPhase[] = ['exploration', 'refinement']
export const STRATEGY_STATUSES: StrategyStatus[] = ['active', 'completed', 'paused']

export interface StrategyItem {
  creativeId: string
  position: number
}

export interface CreativeStrategyProps {
  customerId: string
  name: string
  phase: StrategyPhase
  status: StrategyStatus
  objective?: CampaignObjective | null
  budget?: number | null
  durationDays?: number | null
  startAt?: Date | null
  endAt?: Date | null
  winnerId?: string | null
  parentStrategyId?: string | null
  notes?: string | null
  items: StrategyItem[]
  createdByUserId: string
  createdAt: Date
  updatedAt: Date
}

export class CreativeStrategy extends AggregateRoot<CreativeStrategyProps> {
  private constructor(props: CreativeStrategyProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<CreativeStrategyProps, 'status' | 'createdAt' | 'updatedAt'> & {
      status?: StrategyStatus
    },
    id?: UniqueEntityID,
  ): CreativeStrategy {
    return new CreativeStrategy(
      {
        ...props,
        items: props.items ?? [],
        status: props.status ?? 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
  }

  static restore(props: CreativeStrategyProps, id: UniqueEntityID): CreativeStrategy {
    return new CreativeStrategy(props, id)
  }

  get customerId(): string { return this.props.customerId }
  get name(): string { return this.props.name }
  get phase(): StrategyPhase { return this.props.phase }
  get status(): StrategyStatus { return this.props.status }
  get objective(): CampaignObjective | null { return this.props.objective ?? null }
  get budget(): number | null { return this.props.budget ?? null }
  get durationDays(): number | null { return this.props.durationDays ?? null }
  get startAt(): Date | null { return this.props.startAt ?? null }
  get endAt(): Date | null { return this.props.endAt ?? null }
  get winnerId(): string | null { return this.props.winnerId ?? null }
  get parentStrategyId(): string | null { return this.props.parentStrategyId ?? null }
  get notes(): string | null { return this.props.notes ?? null }
  get items(): StrategyItem[] { return this.props.items }
  get createdByUserId(): string { return this.props.createdByUserId }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  updateDetails(details: {
    name?: string
    objective?: CampaignObjective | null
    budget?: number | null
    durationDays?: number | null
    startAt?: Date | null
    endAt?: Date | null
    notes?: string | null
  }): void {
    if (details.name !== undefined) this.props.name = details.name
    if (details.objective !== undefined) this.props.objective = details.objective
    if (details.budget !== undefined) this.props.budget = details.budget
    if (details.durationDays !== undefined) this.props.durationDays = details.durationDays
    if (details.startAt !== undefined) this.props.startAt = details.startAt
    if (details.endAt !== undefined) this.props.endAt = details.endAt
    if (details.notes !== undefined) this.props.notes = details.notes
    this.props.updatedAt = new Date()
  }

  setWinner(creativeId: string): void {
    this.props.winnerId = creativeId
    this.props.updatedAt = new Date()
  }

  complete(): void {
    this.props.status = 'completed'
    this.props.endAt = this.props.endAt ?? new Date()
    this.props.updatedAt = new Date()
  }

  pause(): void {
    this.props.status = 'paused'
    this.props.updatedAt = new Date()
  }

  activate(): void {
    this.props.status = 'active'
    this.props.updatedAt = new Date()
  }

  addItem(creativeId: string, position?: number): void {
    const alreadyAdded = this.props.items.some((i) => i.creativeId === creativeId)
    if (alreadyAdded) return
    const pos = position ?? this.props.items.length
    this.props.items = [...this.props.items, { creativeId, position: pos }]
    this.props.updatedAt = new Date()
  }

  removeItem(creativeId: string): void {
    this.props.items = this.props.items.filter((i) => i.creativeId !== creativeId)
    this.props.updatedAt = new Date()
  }
}
