import { describe, it, expect, beforeEach } from 'vitest'
import { GetCampaignUseCase } from './get-campaign.use-case'
import { InMemoryCampaignRepository } from './_test/in-memory-campaign.repository'
import { InMemoryAdSetRepository } from './_test/in-memory-ad-set.repository'
import { InMemoryAdRepository } from './_test/in-memory-ad.repository'
import { makeCampaign, makeAdSet, makeAd } from './_test/factories'

let campaignRepo: InMemoryCampaignRepository
let adSetRepo: InMemoryAdSetRepository
let adRepo: InMemoryAdRepository
let sut: GetCampaignUseCase

beforeEach(() => {
  campaignRepo = new InMemoryCampaignRepository()
  adSetRepo = new InMemoryAdSetRepository()
  adRepo = new InMemoryAdRepository()
  sut = new GetCampaignUseCase(campaignRepo, adSetRepo, adRepo)
})

describe('GetCampaignUseCase', () => {
  it('should return campaign with nested ad sets and ads', async () => {
    const campaign = makeCampaign({}, 'campaign-1')
    await campaignRepo.save(campaign)

    const adSet = makeAdSet({ campaignId: 'campaign-1' }, 'ad-set-1')
    await adSetRepo.save(adSet)

    const ad = makeAd({ adSetId: 'ad-set-1' }, 'ad-1')
    await adRepo.save(ad)

    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.campaign.id.value).toBe('campaign-1')
      expect(result.value.adSets).toHaveLength(1)
      expect(result.value.adSets[0].ads).toHaveLength(1)
      expect(result.value.adSets[0].ads[0].id.value).toBe('ad-1')
    }
  })

  it('should return error when campaign not found', async () => {
    const result = await sut.execute({ campaignId: 'ghost' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('ghost')
  })

  it('should return campaign with empty adSets when none exist', async () => {
    const campaign = makeCampaign({}, 'campaign-1')
    await campaignRepo.save(campaign)

    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.adSets).toHaveLength(0)
    }
  })
})
