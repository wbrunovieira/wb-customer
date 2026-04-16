import { describe, it, expect, beforeEach } from 'vitest'
import { MarkCampaignReadyUseCase } from './mark-campaign-ready.use-case'
import { InMemoryCampaignRepository } from './_test/in-memory-campaign.repository'
import { makeCampaign } from './_test/factories'

let repo: InMemoryCampaignRepository
let sut: MarkCampaignReadyUseCase

beforeEach(() => {
  repo = new InMemoryCampaignRepository()
  sut = new MarkCampaignReadyUseCase(repo)
})

describe('MarkCampaignReadyUseCase', () => {
  it('should mark campaign as ready_to_publish from draft', async () => {
    const campaign = makeCampaign({ publishStatus: 'draft' }, 'campaign-1')
    await repo.save(campaign)

    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isRight()).toBe(true)
    expect(repo.items[0].publishStatus).toBe('ready_to_publish')
  })

  it('should return error when campaign not found', async () => {
    const result = await sut.execute({ campaignId: 'ghost' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('ghost')
  })

  it('should return error when campaign is not in draft status', async () => {
    const campaign = makeCampaign({ publishStatus: 'published' }, 'campaign-1')
    await repo.save(campaign)

    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('draft')
  })
})
