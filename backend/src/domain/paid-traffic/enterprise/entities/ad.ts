import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { AdCampaignStatus, CampaignPublishStatus } from './campaign'

export type AdCallToAction =
  | 'LEARN_MORE'
  | 'SHOP_NOW'
  | 'SIGN_UP'
  | 'CONTACT_US'
  | 'BOOK_NOW'
  | 'DOWNLOAD'
  | 'GET_QUOTE'
  | 'SUBSCRIBE'
  | 'WATCH_MORE'
  | 'NO_BUTTON'

export interface AdProps {
  adSetId: string
  creativeId?: string | null
  name: string
  status: AdCampaignStatus
  publishStatus: CampaignPublishStatus
  primaryText?: string | null
  headline?: string | null
  description?: string | null
  callToAction: AdCallToAction
  destinationUrl?: string | null
  metaAdId?: string | null
  metaCreativeId?: string | null
  publishError?: string | null
  createdAt: Date
  updatedAt: Date
}

export class Ad extends AggregateRoot<AdProps> {
  private constructor(props: AdProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<AdProps, 'status' | 'publishStatus' | 'createdAt' | 'updatedAt'> & {
      status?: AdCampaignStatus
      publishStatus?: CampaignPublishStatus
    },
    id?: UniqueEntityID,
  ): Ad {
    return new Ad(
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

  static restore(props: AdProps, id: UniqueEntityID): Ad {
    return new Ad(props, id)
  }

  get adSetId(): string { return this.props.adSetId }
  get creativeId(): string | null { return this.props.creativeId ?? null }
  get name(): string { return this.props.name }
  get status(): AdCampaignStatus { return this.props.status }
  get publishStatus(): CampaignPublishStatus { return this.props.publishStatus }
  get primaryText(): string | null { return this.props.primaryText ?? null }
  get headline(): string | null { return this.props.headline ?? null }
  get description(): string | null { return this.props.description ?? null }
  get callToAction(): AdCallToAction { return this.props.callToAction }
  get destinationUrl(): string | null { return this.props.destinationUrl ?? null }
  get metaAdId(): string | null { return this.props.metaAdId ?? null }
  get metaCreativeId(): string | null { return this.props.metaCreativeId ?? null }
  get publishError(): string | null { return this.props.publishError ?? null }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  update(details: {
    name?: string
    status?: AdCampaignStatus
    creativeId?: string | null
    primaryText?: string | null
    headline?: string | null
    description?: string | null
    callToAction?: AdCallToAction
    destinationUrl?: string | null
  }): void {
    if (details.name !== undefined) this.props.name = details.name
    if (details.status !== undefined) this.props.status = details.status
    if (details.creativeId !== undefined) this.props.creativeId = details.creativeId
    if (details.primaryText !== undefined) this.props.primaryText = details.primaryText
    if (details.headline !== undefined) this.props.headline = details.headline
    if (details.description !== undefined) this.props.description = details.description
    if (details.callToAction !== undefined) this.props.callToAction = details.callToAction
    if (details.destinationUrl !== undefined) this.props.destinationUrl = details.destinationUrl
    this.props.updatedAt = new Date()
  }

  markPublished(metaAdId: string, metaCreativeId: string): void {
    this.props.publishStatus = 'published'
    this.props.metaAdId = metaAdId
    this.props.metaCreativeId = metaCreativeId
    this.props.publishError = null
    this.props.updatedAt = new Date()
  }

  markPublishFailed(error: string): void {
    this.props.publishStatus = 'publish_failed'
    this.props.publishError = error
    this.props.updatedAt = new Date()
  }
}
