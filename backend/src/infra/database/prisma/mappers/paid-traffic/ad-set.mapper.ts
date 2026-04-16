import { AdSet as PrismaAdSet } from '@prisma/client'
import { AdSet } from '@/domain/paid-traffic/enterprise/entities/ad-set'
import { AdCampaignStatus, CampaignPublishStatus } from '@/domain/paid-traffic/enterprise/entities/campaign'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class AdSetMapper {
  static toDomain(raw: PrismaAdSet): AdSet {
    return AdSet.restore(
      {
        campaignId: raw.campaignId,
        name: raw.name,
        status: raw.status as AdCampaignStatus,
        publishStatus: raw.publishStatus as CampaignPublishStatus,
        dailyBudget: raw.dailyBudget,
        totalBudget: raw.totalBudget,
        startAt: raw.startAt,
        endAt: raw.endAt,
        targeting: raw.targeting,
        optimizationGoal: raw.optimizationGoal,
        billingEvent: raw.billingEvent,
        metaAdSetId: raw.metaAdSetId,
        publishError: raw.publishError,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(adSet: AdSet): PrismaAdSet {
    return {
      id: adSet.id.value,
      campaignId: adSet.campaignId,
      name: adSet.name,
      status: adSet.status as PrismaAdSet['status'],
      publishStatus: adSet.publishStatus as PrismaAdSet['publishStatus'],
      dailyBudget: adSet.dailyBudget,
      totalBudget: adSet.totalBudget,
      startAt: adSet.startAt,
      endAt: adSet.endAt,
      targeting: adSet.targeting ?? null,
      optimizationGoal: adSet.optimizationGoal,
      billingEvent: adSet.billingEvent,
      metaAdSetId: adSet.metaAdSetId,
      publishError: adSet.publishError,
      createdAt: adSet.createdAt,
      updatedAt: adSet.updatedAt,
    }
  }
}
