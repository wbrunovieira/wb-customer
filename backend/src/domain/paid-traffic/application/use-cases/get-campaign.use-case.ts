import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICampaignRepository } from '../repositories/i-campaign.repository'
import { IAdSetRepository } from '../repositories/i-ad-set.repository'
import { IAdRepository } from '../repositories/i-ad.repository'
import { Campaign } from '../../enterprise/entities/campaign'
import { AdSet } from '../../enterprise/entities/ad-set'
import { Ad } from '../../enterprise/entities/ad'

export interface GetCampaignRequest {
  campaignId: string
}

export interface GetCampaignResponse {
  campaign: Campaign
  adSets: Array<{ adSet: AdSet; ads: Ad[] }>
}

export type GetCampaignResult = Either<Error, GetCampaignResponse>

@Injectable()
export class GetCampaignUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository,
    private readonly adSetRepo: IAdSetRepository,
    private readonly adRepo: IAdRepository,
  ) {}

  async execute(req: GetCampaignRequest): Promise<GetCampaignResult> {
    const campaign = await this.campaignRepo.findById(req.campaignId)
    if (!campaign) {
      return left(new Error(`Campaign not found: ${req.campaignId}`))
    }

    const adSets = await this.adSetRepo.findByCampaignId(req.campaignId)

    const adSetsWithAds = await Promise.all(
      adSets.map(async (adSet) => {
        const ads = await this.adRepo.findByAdSetId(adSet.id.value)
        return { adSet, ads }
      }),
    )

    return right({ campaign, adSets: adSetsWithAds })
  }
}
