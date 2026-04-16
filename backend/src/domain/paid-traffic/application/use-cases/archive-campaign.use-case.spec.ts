import { describe, it, expect, beforeEach } from 'vitest'
import { ArchiveCampaignUseCase } from './archive-campaign.use-case'
import { InMemoryCampaignRepository } from './_test/in-memory-campaign.repository'
import { makeCampaign } from './_test/factories'

let repo: InMemoryCampaignRepository
let sut: ArchiveCampaignUseCase

beforeEach(() => {
  repo = new InMemoryCampaignRepository()
  sut = new ArchiveCampaignUseCase(repo)
})

describe('ArchiveCampaignUseCase', () => {
  it('should archive a campaign', async () => {
    const campaign = makeCampaign({ status: 'active' }, 'campaign-1')
    await repo.save(campaign)

    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isRight()).toBe(true)
    expect(repo.items[0].status).toBe('archived')
  })

  it('should return error when campaign not found', async () => {
    const result = await sut.execute({ campaignId: 'ghost' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('ghost')
  })
})
