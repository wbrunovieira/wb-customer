import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SyncCampaignMetricsUseCase } from './sync-campaign-metrics.use-case'
import { InMemoryCampaignRepository } from './_test/in-memory-campaign.repository'
import { InMemoryAdSetRepository } from './_test/in-memory-ad-set.repository'
import { InMemoryAdRepository } from './_test/in-memory-ad.repository'
import { InMemoryMetaAdAccountRepository } from './_test/in-memory-meta-ad-account.repository'
import { InMemoryAdDailyMetricRepository } from './_test/in-memory-ad-daily-metric.repository'
import { makeCampaign, makeAdSet, makeAd, makeMetaAdAccount } from './_test/factories'
import { IAdPlatformAdapter, AdMetricsResult } from '../services/i-ad-platform.adapter'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { Ad } from '../../enterprise/entities/ad'

function makeAdapter(metricsResults: AdMetricsResult[] = []): IAdPlatformAdapter {
  return {
    createCampaign: vi.fn(),
    createAdSet: vi.fn(),
    uploadImage: vi.fn(),
    createAd: vi.fn(),
    pauseCampaign: vi.fn(),
    resumeCampaign: vi.fn(),
    syncMetrics: vi.fn().mockResolvedValue(metricsResults),
  } as unknown as IAdPlatformAdapter
}

let campaignRepo: InMemoryCampaignRepository
let adSetRepo: InMemoryAdSetRepository
let adRepo: InMemoryAdRepository
let metaAdAccountRepo: InMemoryMetaAdAccountRepository
let metricRepo: InMemoryAdDailyMetricRepository
let adapter: IAdPlatformAdapter
let sut: SyncCampaignMetricsUseCase

beforeEach(() => {
  campaignRepo = new InMemoryCampaignRepository()
  adSetRepo = new InMemoryAdSetRepository()
  adRepo = new InMemoryAdRepository()
  metaAdAccountRepo = new InMemoryMetaAdAccountRepository()
  metricRepo = new InMemoryAdDailyMetricRepository()
  adapter = makeAdapter()
  sut = new SyncCampaignMetricsUseCase(
    campaignRepo,
    adSetRepo,
    adRepo,
    metaAdAccountRepo,
    metricRepo,
    adapter,
  )
})

describe('SyncCampaignMetricsUseCase', () => {
  it('should return synced: 0 when no ads have metaAdId', async () => {
    const campaign = makeCampaign({ customerId: 'customer-1', publishStatus: 'published' }, 'campaign-1')
    await campaignRepo.save(campaign)

    const account = makeMetaAdAccount({ customerId: 'customer-1', adAccountId: 'act_123' })
    await metaAdAccountRepo.save(account)

    const adSet = makeAdSet({ campaignId: 'campaign-1' }, 'adset-1')
    await adSetRepo.save(adSet)

    // Ad without metaAdId
    const ad = makeAd({ adSetId: 'adset-1' }, 'ad-1')
    await adRepo.save(ad)

    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isRight()).toBe(true)
    expect(result.value).toEqual({ synced: 0 })
    expect(adapter.syncMetrics).not.toHaveBeenCalled()
  })

  it('should sync metrics for ads with metaAdId', async () => {
    const mockMetrics: AdMetricsResult[] = [
      {
        metaAdId: 'meta_ad_1',
        date: '2026-04-15',
        impressions: 1000,
        clicks: 50,
        reach: 900,
        spend: 25.5,
        conversions: 5,
        results: 5,
        ctr: 5.0,
        cpc: 0.51,
        cpm: 25.5,
        cpp: null,
        roas: 4.2,
        frequency: 1.1,
      },
    ]
    adapter = makeAdapter(mockMetrics)
    sut = new SyncCampaignMetricsUseCase(
      campaignRepo,
      adSetRepo,
      adRepo,
      metaAdAccountRepo,
      metricRepo,
      adapter,
    )

    const campaign = makeCampaign({ customerId: 'customer-1', publishStatus: 'published' }, 'campaign-1')
    await campaignRepo.save(campaign)

    const account = makeMetaAdAccount({ customerId: 'customer-1', adAccountId: 'act_123' })
    await metaAdAccountRepo.save(account)

    const adSet = makeAdSet({ campaignId: 'campaign-1' }, 'adset-1')
    await adSetRepo.save(adSet)

    // Ad WITH metaAdId
    const ad = Ad.restore(
      {
        adSetId: 'adset-1',
        name: 'Test Ad',
        status: 'active',
        publishStatus: 'published',
        callToAction: 'LEARN_MORE',
        metaAdId: 'meta_ad_1',
        metaCreativeId: 'meta_creative_1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      new UniqueEntityID('ad-1'),
    )
    await adRepo.save(ad)

    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isRight()).toBe(true)
    expect(result.value).toEqual({ synced: 1 })

    expect(adapter.syncMetrics).toHaveBeenCalledWith({
      adAccountId: 'act_123',
      adIds: ['meta_ad_1'],
      dateRange: expect.objectContaining({ since: expect.any(String), until: expect.any(String) }),
    })

    expect(metricRepo.items).toHaveLength(1)
    expect(metricRepo.items[0].impressions).toBe(1000)
    expect(metricRepo.items[0].clicks).toBe(50)
    expect(metricRepo.items[0].spent).toBe(25.5)
  })

  it('should return error when campaign not found', async () => {
    const result = await sut.execute({ campaignId: 'ghost-id' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('ghost-id')
  })
})
