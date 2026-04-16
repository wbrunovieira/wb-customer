import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICampaignRepository } from '../repositories/i-campaign.repository'
import { IAdSetRepository } from '../repositories/i-ad-set.repository'
import { IAdRepository } from '../repositories/i-ad.repository'
import { IMetaAdAccountRepository } from '../repositories/i-meta-ad-account.repository'
import { IMetaConfigRepository } from '../repositories/i-meta-config.repository'
import { IAdPlatformAdapter } from '../services/i-ad-platform.adapter'

export interface PublishCampaignRequest {
  campaignId: string
}

export interface PublishCampaignResponse {
  campaignId: string
}

export type PublishCampaignResult = Either<Error, PublishCampaignResponse>

@Injectable()
export class PublishCampaignUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository,
    private readonly adSetRepo: IAdSetRepository,
    private readonly adRepo: IAdRepository,
    private readonly metaAdAccountRepo: IMetaAdAccountRepository,
    private readonly metaConfigRepo: IMetaConfigRepository,
    private readonly adapter: IAdPlatformAdapter,
  ) {}

  async execute(req: PublishCampaignRequest): Promise<PublishCampaignResult> {
    // 1. Find campaign
    const campaign = await this.campaignRepo.findById(req.campaignId)
    if (!campaign) {
      return left(new Error(`Campaign not found: ${req.campaignId}`))
    }

    // 2. Validate status
    if (campaign.publishStatus !== 'ready_to_publish') {
      return left(
        new Error(
          `Campaign must be in "ready_to_publish" state to publish. Current state: "${campaign.publishStatus}"`,
        ),
      )
    }

    // 3. Find MetaAdAccount
    const adAccount = await this.metaAdAccountRepo.findByCustomerId(campaign.customerId)
    if (!adAccount) {
      return left(
        new Error(`MetaAdAccount not found for customer: ${campaign.customerId}`),
      )
    }

    // 4. Find MetaConfig
    const metaConfig = await this.metaConfigRepo.find()
    if (!metaConfig) {
      return left(new Error('MetaConfig not found'))
    }

    try {
      // 5. Create campaign on Meta
      const metaCampaign = await this.adapter.createCampaign({
        adAccountId: adAccount.adAccountId,
        name: campaign.name,
        objective: campaign.objective,
        status: 'ACTIVE',
        specialAdCategories: [],
      })

      campaign.markPublished(metaCampaign.externalId)
      campaign.markPublishing()
      await this.campaignRepo.save(campaign)

      // 6. Process each AdSet
      const adSets = await this.adSetRepo.findByCampaignId(campaign.id.value)

      for (const adSet of adSets) {
        const metaAdSet = await this.adapter.createAdSet({
          adAccountId: adAccount.adAccountId,
          campaignId: metaCampaign.externalId,
          name: adSet.name,
          status: 'ACTIVE',
          dailyBudget: adSet.dailyBudget ?? undefined,
          lifetimeBudget: adSet.totalBudget ?? undefined,
          startTime: adSet.startAt?.toISOString(),
          endTime: adSet.endAt?.toISOString(),
          targeting: (adSet.targeting as Record<string, unknown>) ?? {},
          optimizationGoal: adSet.optimizationGoal ?? 'OFFSITE_CONVERSIONS',
          billingEvent: adSet.billingEvent ?? 'IMPRESSIONS',
        })

        adSet.markPublished(metaAdSet.externalId)
        await this.adSetRepo.save(adSet)

        // 6b. Process each Ad
        const ads = await this.adRepo.findByAdSetId(adSet.id.value)

        for (const ad of ads) {
          const metaAd = await this.adapter.createAd({
            adAccountId: adAccount.adAccountId,
            adSetId: metaAdSet.externalId,
            name: ad.name,
            status: 'ACTIVE',
            pageId: adAccount.pageId ?? '',
            primaryText: ad.primaryText ?? '',
            headline: ad.headline ?? undefined,
            description: ad.description ?? undefined,
            callToAction: ad.callToAction,
            link: ad.destinationUrl ?? '',
          })

          ad.markPublished(metaAd.externalId, metaAd.creativeId)
          await this.adRepo.save(ad)
        }
      }

      // 7. Mark campaign as published
      campaign.markPublished(metaCampaign.externalId)
      await this.campaignRepo.save(campaign)

      return right({ campaignId: campaign.id.value })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      campaign.markPublishFailed(message)
      await this.campaignRepo.save(campaign)
      return left(new Error(message))
    }
  }
}
