import { Ad as PrismaAd } from '@prisma/client'
import { Ad, AdCallToAction } from '@/domain/paid-traffic/enterprise/entities/ad'
import { AdCampaignStatus, CampaignPublishStatus } from '@/domain/paid-traffic/enterprise/entities/campaign'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class AdMapper {
  static toDomain(raw: PrismaAd): Ad {
    return Ad.restore(
      {
        adSetId: raw.adSetId,
        creativeId: raw.creativeId,
        name: raw.name,
        status: raw.status as AdCampaignStatus,
        publishStatus: raw.publishStatus as CampaignPublishStatus,
        primaryText: raw.primaryText,
        headline: raw.headline,
        description: raw.description,
        callToAction: raw.callToAction as AdCallToAction,
        destinationUrl: raw.destinationUrl,
        metaAdId: raw.metaAdId,
        metaCreativeId: raw.metaCreativeId,
        publishError: raw.publishError,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(ad: Ad): PrismaAd {
    return {
      id: ad.id.value,
      adSetId: ad.adSetId,
      creativeId: ad.creativeId,
      name: ad.name,
      status: ad.status as PrismaAd['status'],
      publishStatus: ad.publishStatus as PrismaAd['publishStatus'],
      primaryText: ad.primaryText,
      headline: ad.headline,
      description: ad.description,
      callToAction: ad.callToAction as PrismaAd['callToAction'],
      destinationUrl: ad.destinationUrl,
      metaAdId: ad.metaAdId,
      metaCreativeId: ad.metaCreativeId,
      publishError: ad.publishError,
      createdAt: ad.createdAt,
      updatedAt: ad.updatedAt,
    }
  }
}
