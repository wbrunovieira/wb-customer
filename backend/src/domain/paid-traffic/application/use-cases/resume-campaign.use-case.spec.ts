import { describe, it, expect, beforeEach } from 'vitest'
import { ResumeCampaignUseCase } from './resume-campaign.use-case'
import { InMemoryCampaignRepository } from './_test/in-memory-campaign.repository'
import { InMemoryMetaAdAccountRepository } from './_test/in-memory-meta-ad-account.repository'
import { makeCampaign, makeMetaAdAccount } from './_test/factories'

class MockAdapter {
  calls: string[] = []
  async pauseCampaign(_adAccountId: string, _metaCampaignId: string): Promise<void> {
    this.calls.push('pause')
  }
  async resumeCampaign(_adAccountId: string, _metaCampaignId: string): Promise<void> {
    this.calls.push('resume')
  }
}

let campaignRepo: InMemoryCampaignRepository
let metaAccountRepo: InMemoryMetaAdAccountRepository
let adapter: MockAdapter
let sut: ResumeCampaignUseCase

beforeEach(() => {
  campaignRepo = new InMemoryCampaignRepository()
  metaAccountRepo = new InMemoryMetaAdAccountRepository()
  adapter = new MockAdapter()
  sut = new ResumeCampaignUseCase(campaignRepo, metaAccountRepo, adapter as never)
})

describe('ResumeCampaignUseCase', () => {
  it('should call resumeCampaign on adapter when campaign is published', async () => {
    const campaign = makeCampaign({ customerId: 'cust-1' }, 'camp-1')
    campaign.markPublished('meta-camp-123')
    campaignRepo.items.push(campaign)

    const account = makeMetaAdAccount({ customerId: 'cust-1', adAccountId: 'act_999' })
    metaAccountRepo.items.push(account)

    const result = await sut.execute({ campaignId: 'camp-1' })

    expect(result.isRight()).toBe(true)
    expect(adapter.calls).toContain('resume')
  })

  it('should return error when campaign not found', async () => {
    const result = await sut.execute({ campaignId: 'ghost' })
    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(Error)
  })

  it('should return error when campaign not yet published to Meta', async () => {
    const campaign = makeCampaign({ customerId: 'cust-1' }, 'camp-1')
    campaignRepo.items.push(campaign)

    const result = await sut.execute({ campaignId: 'camp-1' })
    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('not published')
  })

  it('should return error when MetaAdAccount is missing', async () => {
    const campaign = makeCampaign({ customerId: 'cust-1' }, 'camp-1')
    campaign.markPublished('meta-camp-123')
    campaignRepo.items.push(campaign)

    const result = await sut.execute({ campaignId: 'camp-1' })
    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('MetaAdAccount not found')
  })
})
