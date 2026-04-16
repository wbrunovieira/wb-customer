import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { IMetaAdAccountRepository } from '../repositories/i-meta-ad-account.repository'
import { MetaAdAccount } from '../../enterprise/entities/meta-ad-account'

export interface SaveMetaAdAccountRequest {
  customerId: string
  adAccountId: string
  pageId?: string | null
  pixelId?: string | null
  instagramActorId?: string | null
  accountName?: string | null
}

export interface SaveMetaAdAccountResponse {
  success: true
}

export type SaveMetaAdAccountResult = Either<Error, SaveMetaAdAccountResponse>

@Injectable()
export class SaveMetaAdAccountUseCase {
  constructor(private readonly metaAdAccountRepo: IMetaAdAccountRepository) {}

  async execute(req: SaveMetaAdAccountRequest): Promise<SaveMetaAdAccountResult> {
    const existing = await this.metaAdAccountRepo.findByCustomerId(req.customerId)

    if (existing) {
      existing.update({
        adAccountId: req.adAccountId,
        pageId: req.pageId ?? null,
        pixelId: req.pixelId ?? null,
        instagramActorId: req.instagramActorId ?? null,
        accountName: req.accountName ?? null,
      })
      await this.metaAdAccountRepo.save(existing)
    } else {
      const account = MetaAdAccount.create({
        customerId: req.customerId,
        adAccountId: req.adAccountId,
        pageId: req.pageId ?? null,
        pixelId: req.pixelId ?? null,
        instagramActorId: req.instagramActorId ?? null,
        accountName: req.accountName ?? null,
      })
      await this.metaAdAccountRepo.save(account)
    }

    return right({ success: true })
  }
}
