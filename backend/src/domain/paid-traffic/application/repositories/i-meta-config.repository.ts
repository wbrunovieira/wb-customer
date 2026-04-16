import { MetaConfig } from '../../enterprise/entities/meta-config'

export abstract class IMetaConfigRepository {
  abstract find(): Promise<MetaConfig | null>
  abstract save(config: MetaConfig): Promise<void>
}
