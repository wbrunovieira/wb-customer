import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'

export type CreativeType = 'image' | 'video' | 'carousel'
export type CreativeStatus = 'draft' | 'active' | 'paused' | 'archived'
export type CreativeStage = 'exploration' | 'refinement' | 'scale'

export const CREATIVE_STAGES: CreativeStage[] = ['exploration', 'refinement', 'scale']
export type CampaignObjective =
  | 'awareness'
  | 'traffic'
  | 'engagement'
  | 'leads'
  | 'sales'
  | 'retargeting'

export const CREATIVE_TYPES: CreativeType[] = ['image', 'video', 'carousel']
export const CREATIVE_STATUSES: CreativeStatus[] = ['draft', 'active', 'paused', 'archived']
export const CAMPAIGN_OBJECTIVES: CampaignObjective[] = [
  'awareness',
  'traffic',
  'engagement',
  'leads',
  'sales',
  'retargeting',
]

export interface CreativeProps {
  customerId: string
  title: string
  caption?: string | null
  textInCreative?: string | null
  designDescription?: string | null
  type: CreativeType
  stage?: CreativeStage | null
  parentCreativeId?: string | null
  variationAspects?: string[]
  objective?: CampaignObjective | null
  status: CreativeStatus
  driveFileId?: string | null
  driveViewUrl?: string | null
  driveDownloadUrl?: string | null
  thumbnailUrl?: string | null
  mimeType?: string | null
  sizeBytes?: bigint | null
  createdByUserId: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export class Creative extends AggregateRoot<CreativeProps> {
  private constructor(props: CreativeProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<CreativeProps, 'status' | 'createdAt' | 'updatedAt' | 'deletedAt'> & {
      status?: CreativeStatus
    },
    id?: UniqueEntityID,
  ): Creative {
    return new Creative(
      {
        ...props,
        status: props.status ?? 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      id,
    )
  }

  static restore(props: CreativeProps, id: UniqueEntityID): Creative {
    return new Creative(props, id)
  }

  get customerId(): string { return this.props.customerId }
  get title(): string { return this.props.title }
  get caption(): string | null { return this.props.caption ?? null }
  get textInCreative(): string | null { return this.props.textInCreative ?? null }
  get designDescription(): string | null { return this.props.designDescription ?? null }
  get type(): CreativeType { return this.props.type }
  get stage(): CreativeStage | null { return this.props.stage ?? null }
  get parentCreativeId(): string | null { return this.props.parentCreativeId ?? null }
  get variationAspects(): string[] { return this.props.variationAspects ?? [] }
  get objective(): CampaignObjective | null { return this.props.objective ?? null }
  get status(): CreativeStatus { return this.props.status }
  get driveFileId(): string | null { return this.props.driveFileId ?? null }
  get driveViewUrl(): string | null { return this.props.driveViewUrl ?? null }
  get driveDownloadUrl(): string | null { return this.props.driveDownloadUrl ?? null }
  get thumbnailUrl(): string | null { return this.props.thumbnailUrl ?? null }
  get mimeType(): string | null { return this.props.mimeType ?? null }
  get sizeBytes(): bigint | null { return this.props.sizeBytes ?? null }
  get createdByUserId(): string { return this.props.createdByUserId }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }
  get deletedAt(): Date | null { return this.props.deletedAt ?? null }
  get isDeleted(): boolean { return !!this.props.deletedAt }
  get hasFile(): boolean { return !!this.props.driveFileId }

  updateDetails(details: {
    title?: string
    caption?: string | null
    textInCreative?: string | null
    designDescription?: string | null
    stage?: CreativeStage | null
    parentCreativeId?: string | null
    variationAspects?: string[]
    objective?: CampaignObjective | null
  }): void {
    if (details.title !== undefined) this.props.title = details.title
    if (details.caption !== undefined) this.props.caption = details.caption
    if (details.textInCreative !== undefined) this.props.textInCreative = details.textInCreative
    if (details.designDescription !== undefined) this.props.designDescription = details.designDescription
    if (details.stage !== undefined) this.props.stage = details.stage
    if (details.parentCreativeId !== undefined) this.props.parentCreativeId = details.parentCreativeId
    if (details.variationAspects !== undefined) this.props.variationAspects = details.variationAspects
    if (details.objective !== undefined) this.props.objective = details.objective
    this.props.updatedAt = new Date()
  }

  attachDriveFile(file: {
    driveFileId: string
    driveViewUrl: string
    driveDownloadUrl: string
    mimeType: string
    sizeBytes?: bigint | null
    thumbnailUrl?: string | null
  }): void {
    this.props.driveFileId = file.driveFileId
    this.props.driveViewUrl = file.driveViewUrl
    this.props.driveDownloadUrl = file.driveDownloadUrl
    this.props.mimeType = file.mimeType
    this.props.sizeBytes = file.sizeBytes ?? null
    this.props.thumbnailUrl = file.thumbnailUrl ?? null
    this.props.updatedAt = new Date()
  }

  changeStatus(status: CreativeStatus): void {
    this.props.status = status
    this.props.updatedAt = new Date()
  }

  softDelete(): void {
    this.props.deletedAt = new Date()
    this.props.updatedAt = new Date()
  }
}
