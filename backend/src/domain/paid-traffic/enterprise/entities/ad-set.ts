import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { AdCampaignStatus, CampaignPublishStatus } from './campaign'

export interface AdSetProps {
  campaignId: string
  name: string
  status: AdCampaignStatus
  publishStatus: CampaignPublishStatus
  dailyBudget?: number | null
  totalBudget?: number | null
  startAt?: Date | null
  endAt?: Date | null
  targeting?: unknown | null
  optimizationGoal?: string | null
  billingEvent?: string | null
  metaAdSetId?: string | null
  publishError?: string | null
  createdAt: Date
  updatedAt: Date
}

export class AdSet extends AggregateRoot<AdSetProps> {
  private constructor(props: AdSetProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<AdSetProps, 'status' | 'publishStatus' | 'createdAt' | 'updatedAt'> & {
      status?: AdCampaignStatus
      publishStatus?: CampaignPublishStatus
    },
    id?: UniqueEntityID,
  ): AdSet {
    return new AdSet(
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

  static restore(props: AdSetProps, id: UniqueEntityID): AdSet {
    return new AdSet(props, id)
  }

  get campaignId(): string { return this.props.campaignId }
  get name(): string { return this.props.name }
  get status(): AdCampaignStatus { return this.props.status }
  get publishStatus(): CampaignPublishStatus { return this.props.publishStatus }
  get dailyBudget(): number | null { return this.props.dailyBudget ?? null }
  get totalBudget(): number | null { return this.props.totalBudget ?? null }
  get startAt(): Date | null { return this.props.startAt ?? null }
  get endAt(): Date | null { return this.props.endAt ?? null }
  get targeting(): unknown { return this.props.targeting ?? null }
  get optimizationGoal(): string | null { return this.props.optimizationGoal ?? null }
  get billingEvent(): string | null { return this.props.billingEvent ?? null }
  get metaAdSetId(): string | null { return this.props.metaAdSetId ?? null }
  get publishError(): string | null { return this.props.publishError ?? null }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  update(details: {
    name?: string
    status?: AdCampaignStatus
    dailyBudget?: number | null
    totalBudget?: number | null
    startAt?: Date | null
    endAt?: Date | null
    targeting?: unknown | null
    optimizationGoal?: string | null
    billingEvent?: string | null
  }): void {
    if (details.name !== undefined) this.props.name = details.name
    if (details.status !== undefined) this.props.status = details.status
    if (details.dailyBudget !== undefined) this.props.dailyBudget = details.dailyBudget
    if (details.totalBudget !== undefined) this.props.totalBudget = details.totalBudget
    if (details.startAt !== undefined) this.props.startAt = details.startAt
    if (details.endAt !== undefined) this.props.endAt = details.endAt
    if (details.targeting !== undefined) this.props.targeting = details.targeting
    if (details.optimizationGoal !== undefined) this.props.optimizationGoal = details.optimizationGoal
    if (details.billingEvent !== undefined) this.props.billingEvent = details.billingEvent
    this.props.updatedAt = new Date()
  }

  markPublished(metaAdSetId: string): void {
    this.props.publishStatus = 'published'
    this.props.metaAdSetId = metaAdSetId
    this.props.publishError = null
    this.props.updatedAt = new Date()
  }

  markPublishFailed(error: string): void {
    this.props.publishStatus = 'publish_failed'
    this.props.publishError = error
    this.props.updatedAt = new Date()
  }
}
