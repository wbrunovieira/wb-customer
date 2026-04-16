import { IMetaAdAccountRepository } from '../../repositories/i-meta-ad-account.repository'
import { MetaAdAccount } from '../../../enterprise/entities/meta-ad-account'

export class InMemoryMetaAdAccountRepository implements IMetaAdAccountRepository {
  public items: MetaAdAccount[] = []

  async findByCustomerId(customerId: string): Promise<MetaAdAccount | null> {
    return this.items.find((a) => a.customerId === customerId) ?? null
  }

  async save(account: MetaAdAccount): Promise<void> {
    const idx = this.items.findIndex((a) => a.customerId === account.customerId)
    if (idx >= 0) {
      this.items[idx] = account
    } else {
      this.items.push(account)
    }
  }
}
