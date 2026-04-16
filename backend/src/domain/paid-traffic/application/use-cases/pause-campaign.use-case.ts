import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICampaignRepository } from '../repositories/i-campaign.repository'
import { IMetaAdAccountRepository } from '../repositories/i-meta-ad-account.repository'
import { IAdPlatformAdapter } from '../services/i-ad-platform.adapter'

export interface PauseCampaignRequest {
  campaignId: string
}

export type PauseCampaignResult = Either<Error, { campaignId: string }>

@Injectable()
export class PauseCampaignUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository,
    private readonly metaAdAccountRepo: IMetaAdAccountRepository,
    private readonly adapter: IAdPlatformAdapter,
  ) {}

  async execute(req: PauseCampaignRequest): Promise<PauseCampaignResult> {
    const campaign = await this.campaignRepo.findById(req.campaignId)
    if (!campaign) {
      return left(new Error(`Campaign not found: ${req.campaignId}`))
    }

    if (!campaign.metaCampaignId) {
      return left(new Error('Campaign is not published to Meta yet'))
    }

    const adAccount = await this.metaAdAccountRepo.findByCustomerId(campaign.customerId)
    if (!adAccount) {
      return left(new Error(`MetaAdAccount not found for customer: ${campaign.customerId}`))
    }

    await this.adapter.pauseCampaign(adAccount.adAccountId, campaign.metaCampaignId)

    return right({ campaignId: campaign.id.value })
  }
}
