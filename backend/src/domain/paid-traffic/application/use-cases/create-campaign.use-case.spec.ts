import { describe, it, expect, beforeEach } from 'vitest'
import { CreateCampaignUseCase } from './create-campaign.use-case'
import { InMemoryCampaignRepository } from './_test/in-memory-campaign.repository'

let repo: InMemoryCampaignRepository
let sut: CreateCampaignUseCase

beforeEach(() => {
  repo = new InMemoryCampaignRepository()
  sut = new CreateCampaignUseCase(repo)
})

describe('CreateCampaignUseCase', () => {
  it('should create a campaign with draft publish status', async () => {
    const result = await sut.execute({
      customerId: 'customer-1',
      name: 'Launch Campaign',
      objective: 'CONVERSIONS',
      createdByUserId: 'user-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const campaign = repo.items[0]
      expect(campaign.name).toBe('Launch Campaign')
      expect(campaign.objective).toBe('CONVERSIONS')
      expect(campaign.publishStatus).toBe('draft')
      expect(campaign.status).toBe('active')
      expect(result.value.campaignId).toBe(campaign.id.value)
    }
  })

  it('should return error for invalid objective', async () => {
    const result = await sut.execute({
      customerId: 'customer-1',
      name: 'Test',
      objective: 'INVALID_OBJECTIVE',
      createdByUserId: 'user-1',
    })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('INVALID_OBJECTIVE')
  })

  it('should persist budget and dates', async () => {
    const startAt = new Date('2026-05-01')
    const endAt = new Date('2026-05-31')

    await sut.execute({
      customerId: 'customer-1',
      name: 'Test',
      objective: 'REACH',
      plannedBudget: 5000,
      dailyBudget: 200,
      startAt,
      endAt,
      createdByUserId: 'user-1',
    })

    const campaign = repo.items[0]
    expect(campaign.plannedBudget).toBe(5000)
    expect(campaign.dailyBudget).toBe(200)
    expect(campaign.startAt).toEqual(startAt)
  })

  it('should not persist when objective is invalid', async () => {
    await sut.execute({
      customerId: 'customer-1',
      name: 'Test',
      objective: 'BAD',
      createdByUserId: 'user-1',
    })

    expect(repo.items).toHaveLength(0)
  })
})
