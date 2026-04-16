import { describe, it, expect, beforeEach } from 'vitest'
import { CreateAdSetUseCase } from './create-ad-set.use-case'
import { InMemoryAdSetRepository } from './_test/in-memory-ad-set.repository'
import { InMemoryCampaignRepository } from './_test/in-memory-campaign.repository'
import { makeCampaign } from './_test/factories'

let adSetRepo: InMemoryAdSetRepository
let campaignRepo: InMemoryCampaignRepository
let sut: CreateAdSetUseCase

beforeEach(() => {
  adSetRepo = new InMemoryAdSetRepository()
  campaignRepo = new InMemoryCampaignRepository()
  sut = new CreateAdSetUseCase(adSetRepo, campaignRepo)
})

describe('CreateAdSetUseCase', () => {
  it('should create an ad set for a valid campaign', async () => {
    const campaign = makeCampaign({}, 'campaign-1')
    await campaignRepo.save(campaign)

    const result = await sut.execute({
      campaignId: 'campaign-1',
      name: 'Target Audience A',
      dailyBudget: 100,
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const adSet = adSetRepo.items[0]
      expect(adSet.name).toBe('Target Audience A')
      expect(adSet.dailyBudget).toBe(100)
      expect(adSet.publishStatus).toBe('draft')
      expect(result.value.adSetId).toBe(adSet.id.value)
    }
  })

  it('should return error when campaign not found', async () => {
    const result = await sut.execute({
      campaignId: 'ghost',
      name: 'Ad Set',
    })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('ghost')
  })

  it('should not persist when campaign not found', async () => {
    await sut.execute({ campaignId: 'ghost', name: 'Ad Set' })
    expect(adSetRepo.items).toHaveLength(0)
  })
})
