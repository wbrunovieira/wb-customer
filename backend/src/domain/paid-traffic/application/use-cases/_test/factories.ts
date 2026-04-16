import { UniqueEntityID } from '@/core/unique-entity-id'
import { Campaign, AdCampaignObjective, AdCampaignStatus, CampaignPublishStatus } from '../../../enterprise/entities/campaign'
import { AdSet } from '../../../enterprise/entities/ad-set'
import { Ad, AdCallToAction } from '../../../enterprise/entities/ad'
import { MetaConfig } from '../../../enterprise/entities/meta-config'
import { MetaAdAccount } from '../../../enterprise/entities/meta-ad-account'

export function makeCampaign(
  overrides: Partial<{
    customerId: string
    name: string
    objective: AdCampaignObjective
    status: AdCampaignStatus
    publishStatus: CampaignPublishStatus
    createdByUserId: string
    plannedBudget: number | null
    dailyBudget: number | null
  }> = {},
  id?: string,
): Campaign {
  return Campaign.create(
    {
      customerId: overrides.customerId ?? 'customer-1',
      name: overrides.name ?? 'Test Campaign',
      objective: overrides.objective ?? 'CONVERSIONS',
      status: overrides.status,
      publishStatus: overrides.publishStatus,
      plannedBudget: overrides.plannedBudget ?? null,
      dailyBudget: overrides.dailyBudget ?? null,
      createdByUserId: overrides.createdByUserId ?? 'user-1',
    },
    id ? new UniqueEntityID(id) : undefined,
  )
}

export function makeAdSet(
  overrides: Partial<{
    campaignId: string
    name: string
    status: AdCampaignStatus
    publishStatus: CampaignPublishStatus
    dailyBudget: number | null
  }> = {},
  id?: string,
): AdSet {
  return AdSet.create(
    {
      campaignId: overrides.campaignId ?? 'campaign-1',
      name: overrides.name ?? 'Test Ad Set',
      status: overrides.status,
      publishStatus: overrides.publishStatus,
      dailyBudget: overrides.dailyBudget ?? null,
    },
    id ? new UniqueEntityID(id) : undefined,
  )
}

export function makeAd(
  overrides: Partial<{
    adSetId: string
    name: string
    creativeId: string | null
    callToAction: AdCallToAction
    status: AdCampaignStatus
  }> = {},
  id?: string,
): Ad {
  return Ad.create(
    {
      adSetId: overrides.adSetId ?? 'ad-set-1',
      name: overrides.name ?? 'Test Ad',
      creativeId: overrides.creativeId ?? null,
      callToAction: overrides.callToAction ?? 'LEARN_MORE',
      status: overrides.status,
    },
    id ? new UniqueEntityID(id) : undefined,
  )
}

export function makeMetaConfig(
  overrides: Partial<{
    appId: string
    appSecret: string
    systemUserToken: string
    bmId: string
  }> = {},
): MetaConfig {
  return MetaConfig.create({
    appId: overrides.appId ?? 'app-123',
    appSecret: overrides.appSecret ?? 'secret-123',
    systemUserToken: overrides.systemUserToken ?? 'token-123',
    bmId: overrides.bmId ?? 'bm-123',
  })
}

export function makeMetaAdAccount(
  overrides: Partial<{
    customerId: string
    adAccountId: string
    pageId: string | null
    pixelId: string | null
    accountName: string | null
  }> = {},
  id?: string,
): MetaAdAccount {
  return MetaAdAccount.create(
    {
      customerId: overrides.customerId ?? 'customer-1',
      adAccountId: overrides.adAccountId ?? 'act_123456',
      pageId: overrides.pageId ?? null,
      pixelId: overrides.pixelId ?? null,
      accountName: overrides.accountName ?? null,
    },
    id ? new UniqueEntityID(id) : undefined,
  )
}
