import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IMetaAdAccountRepository } from '../repositories/i-meta-ad-account.repository'
import { MetaAdAccount } from '../../enterprise/entities/meta-ad-account'

export interface GetMetaAdAccountRequest {
  customerId: string
}

export interface GetMetaAdAccountResponse {
  account: MetaAdAccount
}

export type GetMetaAdAccountResult = Either<Error, GetMetaAdAccountResponse>

@Injectable()
export class GetMetaAdAccountUseCase {
  constructor(private readonly metaAdAccountRepo: IMetaAdAccountRepository) {}

  async execute(req: GetMetaAdAccountRequest): Promise<GetMetaAdAccountResult> {
    const account = await this.metaAdAccountRepo.findByCustomerId(req.customerId)
    if (!account) {
      return left(new Error(`Meta ad account not found for customer: ${req.customerId}`))
    }
    return right({ account })
  }
}
