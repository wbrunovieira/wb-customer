import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateCampaignUseCase } from './update-campaign.use-case'
import { InMemoryCampaignRepository } from './_test/in-memory-campaign.repository'
import { makeCampaign } from './_test/factories'

let repo: InMemoryCampaignRepository
let sut: UpdateCampaignUseCase

beforeEach(() => {
  repo = new InMemoryCampaignRepository()
  sut = new UpdateCampaignUseCase(repo)
})

describe('UpdateCampaignUseCase', () => {
  it('should update campaign fields', async () => {
    const campaign = makeCampaign({ name: 'Old Name' }, 'campaign-1')
    await repo.save(campaign)

    const result = await sut.execute({
      campaignId: 'campaign-1',
      name: 'New Name',
      notes: 'Updated notes',
    })

    expect(result.isRight()).toBe(true)
    const updated = repo.items[0]
    expect(updated.name).toBe('New Name')
    expect(updated.notes).toBe('Updated notes')
  })

  it('should return error when campaign not found', async () => {
    const result = await sut.execute({ campaignId: 'ghost', name: 'Test' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('ghost')
  })

  it('should return error for invalid objective', async () => {
    const campaign = makeCampaign({}, 'campaign-1')
    await repo.save(campaign)

    const result = await sut.execute({
      campaignId: 'campaign-1',
      objective: 'INVALID',
    })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('INVALID')
  })
})
