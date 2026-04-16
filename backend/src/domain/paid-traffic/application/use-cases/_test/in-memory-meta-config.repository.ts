import { IMetaConfigRepository } from '../../repositories/i-meta-config.repository'
import { MetaConfig } from '../../../enterprise/entities/meta-config'

export class InMemoryMetaConfigRepository implements IMetaConfigRepository {
  public item: MetaConfig | null = null

  async find(): Promise<MetaConfig | null> {
    return this.item
  }

  async save(config: MetaConfig): Promise<void> {
    this.item = config
  }
}
