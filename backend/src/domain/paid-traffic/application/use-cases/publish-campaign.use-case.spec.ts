import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PublishCampaignUseCase } from './publish-campaign.use-case'
import { InMemoryCampaignRepository } from './_test/in-memory-campaign.repository'
import { InMemoryAdSetRepository } from './_test/in-memory-ad-set.repository'
import { InMemoryAdRepository } from './_test/in-memory-ad.repository'
import { InMemoryMetaAdAccountRepository } from './_test/in-memory-meta-ad-account.repository'
import { InMemoryMetaConfigRepository } from './_test/in-memory-meta-config.repository'
import { makeCampaign, makeAdSet, makeAd, makeMetaAdAccount, makeMetaConfig } from './_test/factories'
import { IAdPlatformAdapter } from '../services/i-ad-platform.adapter'

function makeAdapter(): IAdPlatformAdapter {
  return {
    createCampaign: vi.fn().mockResolvedValue({ externalId: 'meta_campaign_1' }),
    createAdSet: vi.fn().mockResolvedValue({ externalId: 'meta_adset_1' }),
    uploadImage: vi.fn().mockResolvedValue({ imageHash: 'hash1', url: 'http://img.example.com' }),
    createAd: vi.fn().mockResolvedValue({ externalId: 'meta_ad_1', creativeId: 'meta_creative_1' }),
    pauseCampaign: vi.fn().mockResolvedValue(undefined),
    resumeCampaign: vi.fn().mockResolvedValue(undefined),
    syncMetrics: vi.fn().mockResolvedValue([]),
  } as unknown as IAdPlatformAdapter
}

let campaignRepo: InMemoryCampaignRepository
let adSetRepo: InMemoryAdSetRepository
let adRepo: InMemoryAdRepository
let metaAdAccountRepo: InMemoryMetaAdAccountRepository
let metaConfigRepo: InMemoryMetaConfigRepository
let adapter: IAdPlatformAdapter
let sut: PublishCampaignUseCase

beforeEach(() => {
  campaignRepo = new InMemoryCampaignRepository()
  adSetRepo = new InMemoryAdSetRepository()
  adRepo = new InMemoryAdRepository()
  metaAdAccountRepo = new InMemoryMetaAdAccountRepository()
  metaConfigRepo = new InMemoryMetaConfigRepository()
  adapter = makeAdapter()
  sut = new PublishCampaignUseCase(
    campaignRepo,
    adSetRepo,
    adRepo,
    metaAdAccountRepo,
    metaConfigRepo,
    adapter,
  )
})

describe('PublishCampaignUseCase', () => {
  it('should publish a campaign with ad sets and ads (full flow)', async () => {
    const campaign = makeCampaign(
      { customerId: 'customer-1', publishStatus: 'ready_to_publish' },
      'campaign-1',
    )
    await campaignRepo.save(campaign)

    const adSet = makeAdSet({ campaignId: 'campaign-1' }, 'adset-1')
    await adSetRepo.save(adSet)

    const ad = makeAd({ adSetId: 'adset-1' }, 'ad-1')
    await adRepo.save(ad)

    const account = makeMetaAdAccount({ customerId: 'customer-1', adAccountId: 'act_123' })
    await metaAdAccountRepo.save(account)

    metaConfigRepo.item = makeMetaConfig()

    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isRight()).toBe(true)

    const savedCampaign = await campaignRepo.findById('campaign-1')
    expect(savedCampaign?.publishStatus).toBe('published')
    expect(savedCampaign?.metaCampaignId).toBe('meta_campaign_1')

    const savedAdSet = await adSetRepo.findById('adset-1')
    expect(savedAdSet?.metaAdSetId).toBe('meta_adset_1')

    const savedAd = await adRepo.findById('ad-1')
    expect(savedAd?.metaAdId).toBe('meta_ad_1')
    expect(savedAd?.metaCreativeId).toBe('meta_creative_1')

    expect(adapter.createCampaign).toHaveBeenCalledTimes(1)
    expect(adapter.createAdSet).toHaveBeenCalledTimes(1)
    expect(adapter.createAd).toHaveBeenCalledTimes(1)
  })

  it('should return error when campaign not found', async () => {
    const result = await sut.execute({ campaignId: 'ghost-id' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('ghost-id')
  })

  it('should return error when campaign is not in ready_to_publish state', async () => {
    const campaign = makeCampaign({ publishStatus: 'draft' }, 'campaign-1')
    await campaignRepo.save(campaign)

    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('ready_to_publish')
  })

  it('should return error when MetaAdAccount is missing', async () => {
    const campaign = makeCampaign(
      { customerId: 'customer-1', publishStatus: 'ready_to_publish' },
      'campaign-1',
    )
    await campaignRepo.save(campaign)
    metaConfigRepo.item = makeMetaConfig()
    // no ad account saved

    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('MetaAdAccount not found')
  })

  it('should mark campaign as publish_failed on adapter error', async () => {
    const campaign = makeCampaign(
      { customerId: 'customer-1', publishStatus: 'ready_to_publish' },
      'campaign-1',
    )
    await campaignRepo.save(campaign)

    const account = makeMetaAdAccount({ customerId: 'customer-1', adAccountId: 'act_123' })
    await metaAdAccountRepo.save(account)

    metaConfigRepo.item = makeMetaConfig()

    vi.spyOn(adapter, 'createCampaign').mockRejectedValueOnce(
      new Error('Meta API error'),
    )

    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('Meta API error')

    const savedCampaign = await campaignRepo.findById('campaign-1')
    expect(savedCampaign?.publishStatus).toBe('publish_failed')
    expect(savedCampaign?.publishError).toContain('Meta API error')
  })
})
