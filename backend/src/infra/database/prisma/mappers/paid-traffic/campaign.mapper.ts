import { Campaign as PrismaCampaign } from '@prisma/client'
import { Campaign, AdCampaignObjective, AdCampaignStatus, CampaignPublishStatus } from '@/domain/paid-traffic/enterprise/entities/campaign'
import { UniqueEntityID } from '@/core/unique-entity-id'

export class CampaignMapper {
  static toDomain(raw: PrismaCampaign): Campaign {
    return Campaign.restore(
      {
        customerId: raw.customerId,
        name: raw.name,
        objective: raw.objective as AdCampaignObjective,
        status: raw.status as AdCampaignStatus,
        publishStatus: raw.publishStatus as CampaignPublishStatus,
        plannedBudget: raw.plannedBudget,
        dailyBudget: raw.dailyBudget,
        startAt: raw.startAt,
        endAt: raw.endAt,
        notes: raw.notes,
        metaCampaignId: raw.metaCampaignId,
        publishError: raw.publishError,
        createdByUserId: raw.createdByUserId,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(campaign: Campaign): PrismaCampaign {
    return {
      id: campaign.id.value,
      customerId: campaign.customerId,
      name: campaign.name,
      objective: campaign.objective as PrismaCampaign['objective'],
      status: campaign.status as PrismaCampaign['status'],
      publishStatus: campaign.publishStatus as PrismaCampaign['publishStatus'],
      plannedBudget: campaign.plannedBudget,
      dailyBudget: campaign.dailyBudget,
      startAt: campaign.startAt,
      endAt: campaign.endAt,
      notes: campaign.notes,
      metaCampaignId: campaign.metaCampaignId,
      publishError: campaign.publishError,
      createdByUserId: campaign.createdByUserId,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    }
  }
}
