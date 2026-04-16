import { describe, it, expect, beforeEach } from 'vitest'
import { GetCampaignDashboardUseCase } from './get-campaign-dashboard.use-case'
import { InMemoryCampaignRepository } from './_test/in-memory-campaign.repository'
import { InMemoryAdSetRepository } from './_test/in-memory-ad-set.repository'
import { InMemoryAdRepository } from './_test/in-memory-ad.repository'
import { InMemoryAdDailyMetricRepository } from './_test/in-memory-ad-daily-metric.repository'
import { makeCampaign, makeAdSet, makeAd } from './_test/factories'

let campaignRepo: InMemoryCampaignRepository
let adSetRepo: InMemoryAdSetRepository
let adRepo: InMemoryAdRepository
let metricRepo: InMemoryAdDailyMetricRepository
let sut: GetCampaignDashboardUseCase

beforeEach(() => {
  campaignRepo = new InMemoryCampaignRepository()
  adSetRepo = new InMemoryAdSetRepository()
  adRepo = new InMemoryAdRepository()
  metricRepo = new InMemoryAdDailyMetricRepository()
  sut = new GetCampaignDashboardUseCase(campaignRepo, adSetRepo, adRepo, metricRepo)
})

describe('GetCampaignDashboardUseCase', () => {
  it('should return error when campaign not found', async () => {
    const result = await sut.execute({ campaignId: 'ghost' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('ghost')
  })

  it('should return dashboard with aggregated totals', async () => {
    const campaign = makeCampaign({}, 'campaign-1')
    await campaignRepo.save(campaign)

    const adSet = makeAdSet({ campaignId: 'campaign-1' }, 'ad-set-1')
    await adSetRepo.save(adSet)

    const ad = makeAd({ adSetId: 'ad-set-1' }, 'ad-1')
    await adRepo.save(ad)

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    await metricRepo.upsert({
      adId: 'ad-1',
      campaignId: 'campaign-1',
      date: yesterday,
      impressions: 1000,
      clicks: 50,
      reach: 900,
      spent: 25,
      conversions: 5,
      results: 5,
    })

    await metricRepo.upsert({
      adId: 'ad-1',
      campaignId: 'campaign-1',
      date: today,
      impressions: 2000,
      clicks: 100,
      reach: 1800,
      spent: 50,
      conversions: 10,
      results: 10,
    })

    const result = await sut.execute({ campaignId: 'campaign-1', days: 30 })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.totals.impressions).toBe(3000)
      expect(result.value.totals.clicks).toBe(150)
      expect(result.value.totals.spent).toBe(75)
      expect(result.value.dailySeries).toHaveLength(2)
      expect(result.value.adSetBreakdown).toHaveLength(1)
      expect(result.value.adSetBreakdown[0].adSet.name).toBe(adSet.name)
    }
  })

  it('should return zero totals when no metrics exist', async () => {
    const campaign = makeCampaign({}, 'campaign-1')
    await campaignRepo.save(campaign)

    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.totals.impressions).toBe(0)
      expect(result.value.totals.ctr).toBeNull()
      expect(result.value.dailySeries).toHaveLength(0)
    }
  })
})
