import { describe, it, expect, beforeEach } from 'vitest'
import { ListCustomerCampaignsUseCase } from './list-customer-campaigns.use-case'
import { InMemoryCampaignRepository } from './_test/in-memory-campaign.repository'
import { makeCampaign } from './_test/factories'

let repo: InMemoryCampaignRepository
let sut: ListCustomerCampaignsUseCase

beforeEach(() => {
  repo = new InMemoryCampaignRepository()
  sut = new ListCustomerCampaignsUseCase(repo)
})

describe('ListCustomerCampaignsUseCase', () => {
  it('should list campaigns for a customer', async () => {
    await repo.save(makeCampaign({ customerId: 'customer-1' }))
    await repo.save(makeCampaign({ customerId: 'customer-1' }))
    await repo.save(makeCampaign({ customerId: 'customer-2' }))

    const result = await sut.execute({ customerId: 'customer-1' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(2)
      expect(result.value.total).toBe(2)
    }
  })

  it('should filter by status', async () => {
    await repo.save(makeCampaign({ customerId: 'customer-1', status: 'active' }))
    await repo.save(makeCampaign({ customerId: 'customer-1', status: 'archived' }))

    const result = await sut.execute({ customerId: 'customer-1', status: 'active' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(1)
      expect(result.value.items[0].status).toBe('active')
    }
  })

  it('should filter by publishStatus', async () => {
    await repo.save(makeCampaign({ customerId: 'customer-1', publishStatus: 'draft' }))
    await repo.save(makeCampaign({ customerId: 'customer-1', publishStatus: 'published' }))

    const result = await sut.execute({ customerId: 'customer-1', publishStatus: 'published' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(1)
    }
  })

  it('should return empty list when customer has no campaigns', async () => {
    const result = await sut.execute({ customerId: 'no-campaigns' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(0)
      expect(result.value.total).toBe(0)
    }
  })
})
