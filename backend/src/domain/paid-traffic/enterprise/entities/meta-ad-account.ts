import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'

export interface MetaAdAccountProps {
  customerId: string
  adAccountId: string
  pageId?: string | null
  pixelId?: string | null
  instagramActorId?: string | null
  accountName?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class MetaAdAccount extends AggregateRoot<MetaAdAccountProps> {
  private constructor(props: MetaAdAccountProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<MetaAdAccountProps, 'isActive' | 'createdAt' | 'updatedAt'> & {
      isActive?: boolean
    },
    id?: UniqueEntityID,
  ): MetaAdAccount {
    return new MetaAdAccount(
      {
        ...props,
        isActive: props.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
  }

  static restore(props: MetaAdAccountProps, id: UniqueEntityID): MetaAdAccount {
    return new MetaAdAccount(props, id)
  }

  get customerId(): string { return this.props.customerId }
  get adAccountId(): string { return this.props.adAccountId }
  get pageId(): string | null { return this.props.pageId ?? null }
  get pixelId(): string | null { return this.props.pixelId ?? null }
  get instagramActorId(): string | null { return this.props.instagramActorId ?? null }
  get accountName(): string | null { return this.props.accountName ?? null }
  get isActive(): boolean { return this.props.isActive }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  update(details: {
    adAccountId?: string
    pageId?: string | null
    pixelId?: string | null
    instagramActorId?: string | null
    accountName?: string | null
  }): void {
    if (details.adAccountId !== undefined) this.props.adAccountId = details.adAccountId
    if (details.pageId !== undefined) this.props.pageId = details.pageId
    if (details.pixelId !== undefined) this.props.pixelId = details.pixelId
    if (details.instagramActorId !== undefined) this.props.instagramActorId = details.instagramActorId
    if (details.accountName !== undefined) this.props.accountName = details.accountName
    this.props.updatedAt = new Date()
  }

  deactivate(): void {
    this.props.isActive = false
    this.props.updatedAt = new Date()
  }
}
