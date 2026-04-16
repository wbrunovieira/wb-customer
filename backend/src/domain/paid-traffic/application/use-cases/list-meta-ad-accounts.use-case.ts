import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IMetaConfigRepository } from '../repositories/i-meta-config.repository'
import { IAdPlatformAdapter, MetaAdAccountEntry } from '../services/i-ad-platform.adapter'

export interface ListMetaAdAccountsResponse {
  accounts: MetaAdAccountEntry[]
}

export type ListMetaAdAccountsResult = Either<Error, ListMetaAdAccountsResponse>

@Injectable()
export class ListMetaAdAccountsUseCase {
  constructor(
    private readonly metaConfigRepo: IMetaConfigRepository,
    private readonly adapter: IAdPlatformAdapter,
  ) {}

  async execute(): Promise<ListMetaAdAccountsResult> {
    const config = await this.metaConfigRepo.find()
    if (!config) {
      return left(new Error('Meta config not found. Please configure the Meta integration first.'))
    }

    const accounts = await this.adapter.listAdAccounts(config.bmId)
    return right({ accounts })
  }
}
