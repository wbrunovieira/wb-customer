import { MetaAdAccount } from '../../enterprise/entities/meta-ad-account'

export abstract class IMetaAdAccountRepository {
  abstract findByCustomerId(customerId: string): Promise<MetaAdAccount | null>
  abstract save(account: MetaAdAccount): Promise<void>
}
