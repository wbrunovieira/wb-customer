import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'

export const META_CONFIG_SINGLETON_ID = 'meta-config-singleton'

export interface MetaConfigProps {
  appId: string
  appSecret: string
  systemUserToken: string
  bmId: string
  createdAt: Date
  updatedAt: Date
}

export class MetaConfig extends AggregateRoot<MetaConfigProps> {
  private constructor(props: MetaConfigProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<MetaConfigProps, 'createdAt' | 'updatedAt'>,
  ): MetaConfig {
    return new MetaConfig(
      {
        ...props,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      new UniqueEntityID(META_CONFIG_SINGLETON_ID),
    )
  }

  static restore(props: MetaConfigProps, id: UniqueEntityID): MetaConfig {
    return new MetaConfig(props, id)
  }

  get appId(): string { return this.props.appId }
  get appSecret(): string { return this.props.appSecret }
  get systemUserToken(): string { return this.props.systemUserToken }
  get bmId(): string { return this.props.bmId }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  update(details: {
    appId?: string
    appSecret?: string
    systemUserToken?: string
    bmId?: string
  }): void {
    if (details.appId !== undefined) this.props.appId = details.appId
    if (details.appSecret !== undefined) this.props.appSecret = details.appSecret
    if (details.systemUserToken !== undefined) this.props.systemUserToken = details.systemUserToken
    if (details.bmId !== undefined) this.props.bmId = details.bmId
    this.props.updatedAt = new Date()
  }
}
