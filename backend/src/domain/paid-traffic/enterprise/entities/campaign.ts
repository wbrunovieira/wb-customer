import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'

export type AdCampaignObjective =
  | 'CONVERSIONS'
  | 'LINK_CLICKS'
  | 'REACH'
  | 'BRAND_AWARENESS'
  | 'LEAD_GENERATION'
  | 'VIDEO_VIEWS'
  | 'POST_ENGAGEMENT'

export type CampaignPublishStatus =
  | 'draft'
  | 'ready_to_publish'
  | 'publishing'
  | 'published'
  | 'publish_failed'

export type AdCampaignStatus = 'active' | 'paused' | 'archived'

export const AD_CAMPAIGN_OBJECTIVES: AdCampaignObjective[] = [
  'CONVERSIONS',
  'LINK_CLICKS',
  'REACH',
  'BRAND_AWARENESS',
  'LEAD_GENERATION',
  'VIDEO_VIEWS',
  'POST_ENGAGEMENT',
]

export interface CampaignProps {
  customerId: string
  name: string
  objective: AdCampaignObjective
  status: AdCampaignStatus
  publishStatus: CampaignPublishStatus
  plannedBudget?: number | null
  dailyBudget?: number | null
  startAt?: Date | null
  endAt?: Date | null
  notes?: string | null
  metaCampaignId?: string | null
  publishError?: string | null
  createdByUserId: string
  createdAt: Date
  updatedAt: Date
}

export class Campaign extends AggregateRoot<CampaignProps> {
  private constructor(props: CampaignProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<CampaignProps, 'status' | 'publishStatus' | 'createdAt' | 'updatedAt'> & {
      status?: AdCampaignStatus
      publishStatus?: CampaignPublishStatus
    },
    id?: UniqueEntityID,
  ): Campaign {
    return new Campaign(
      {
        ...props,
        status: props.status ?? 'active',
        publishStatus: props.publishStatus ?? 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
  }

  static restore(props: CampaignProps, id: UniqueEntityID): Campaign {
    return new Campaign(props, id)
  }

  get customerId(): string { return this.props.customerId }
  get name(): string { return this.props.name }
  get objective(): AdCampaignObjective { return this.props.objective }
  get status(): AdCampaignStatus { return this.props.status }
  get publishStatus(): CampaignPublishStatus { return this.props.publishStatus }
  get plannedBudget(): number | null { return this.props.plannedBudget ?? null }
  get dailyBudget(): number | null { return this.props.dailyBudget ?? null }
  get startAt(): Date | null { return this.props.startAt ?? null }
  get endAt(): Date | null { return this.props.endAt ?? null }
  get notes(): string | null { return this.props.notes ?? null }
  get metaCampaignId(): string | null { return this.props.metaCampaignId ?? null }
  get publishError(): string | null { return this.props.publishError ?? null }
  get createdByUserId(): string { return this.props.createdByUserId }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  update(details: {
    name?: string
    objective?: AdCampaignObjective
    plannedBudget?: number | null
    dailyBudget?: number | null
    startAt?: Date | null
    endAt?: Date | null
    notes?: string | null
  }): void {
    if (details.name !== undefined) this.props.name = details.name
    if (details.objective !== undefined) this.props.objective = details.objective
    if (details.plannedBudget !== undefined) this.props.plannedBudget = details.plannedBudget
    if (details.dailyBudget !== undefined) this.props.dailyBudget = details.dailyBudget
    if (details.startAt !== undefined) this.props.startAt = details.startAt
    if (details.endAt !== undefined) this.props.endAt = details.endAt
    if (details.notes !== undefined) this.props.notes = details.notes
    this.props.updatedAt = new Date()
  }

  markReady(): void {
    this.props.publishStatus = 'ready_to_publish'
    this.props.updatedAt = new Date()
  }

  markPublishing(): void {
    this.props.publishStatus = 'publishing'
    this.props.updatedAt = new Date()
  }

  markPublished(metaCampaignId: string): void {
    this.props.publishStatus = 'published'
    this.props.metaCampaignId = metaCampaignId
    this.props.publishError = null
    this.props.updatedAt = new Date()
  }

  markPublishFailed(error: string): void {
    this.props.publishStatus = 'publish_failed'
    this.props.publishError = error
    this.props.updatedAt = new Date()
  }

  archive(): void {
    this.props.status = 'archived'
    this.props.updatedAt = new Date()
  }
}
