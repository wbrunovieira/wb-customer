import { describe, it, expect, beforeEach } from 'vitest'
import { DeleteCampaignUseCase } from './delete-campaign.use-case'
import { InMemoryCampaignRepository } from './_test/in-memory-campaign.repository'
import { makeCampaign } from './_test/factories'

let repo: InMemoryCampaignRepository
let sut: DeleteCampaignUseCase

beforeEach(() => {
  repo = new InMemoryCampaignRepository()
  sut = new DeleteCampaignUseCase(repo)
})

describe('DeleteCampaignUseCase', () => {
  it('should delete a campaign', async () => {
    await repo.save(makeCampaign({}, 'campaign-1'))

    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isRight()).toBe(true)
    expect(repo.items).toHaveLength(0)
  })

  it('should return error when campaign not found', async () => {
    const result = await sut.execute({ campaignId: 'ghost' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('ghost')
  })
})
