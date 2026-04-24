import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IMetaConfigRepository } from '../repositories/i-meta-config.repository'
import { IAdPlatformAdapter } from '../services/i-ad-platform.adapter'

export interface CreateMetaAdAccountInput {
  name: string
  currency?: string
  timezoneId?: number
  endAdvertiser?: string
}

export type CreateMetaAdAccountResult = Either<Error, { id: string; name: string }>

@Injectable()
export class CreateMetaAdAccountUseCase {
  constructor(
    private readonly metaConfigRepo: IMetaConfigRepository,
    private readonly adapter: IAdPlatformAdapter,
  ) {}

  async execute(input: CreateMetaAdAccountInput): Promise<CreateMetaAdAccountResult> {
    const config = await this.metaConfigRepo.find()
    if (!config) {
      return left(new Error('Meta config not found. Please configure the Meta integration first.'))
    }

    try {
      const account = await this.adapter.createAdAccount({
        bmId: config.bmId,
        name: input.name,
        currency: input.currency,
        timezoneId: input.timezoneId,
        endAdvertiser: input.endAdvertiser,
      })
      return right(account)
    } catch (err) {
      return left(err instanceof Error ? err : new Error(String(err)))
    }
  }
}
