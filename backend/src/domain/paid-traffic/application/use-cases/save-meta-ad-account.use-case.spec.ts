import { describe, it, expect, beforeEach } from 'vitest'
import { SaveMetaAdAccountUseCase } from './save-meta-ad-account.use-case'
import { InMemoryMetaAdAccountRepository } from './_test/in-memory-meta-ad-account.repository'
import { makeMetaAdAccount } from './_test/factories'

let repo: InMemoryMetaAdAccountRepository
let sut: SaveMetaAdAccountUseCase

beforeEach(() => {
  repo = new InMemoryMetaAdAccountRepository()
  sut = new SaveMetaAdAccountUseCase(repo)
})

describe('SaveMetaAdAccountUseCase', () => {
  it('should create meta ad account when none exists for customer', async () => {
    const result = await sut.execute({
      customerId: 'customer-1',
      adAccountId: 'act_999',
      pageId: 'page-1',
    })

    expect(result.isRight()).toBe(true)
    expect(repo.items).toHaveLength(1)
    expect(repo.items[0].adAccountId).toBe('act_999')
    expect(repo.items[0].pageId).toBe('page-1')
  })

  it('should update existing meta ad account', async () => {
    repo.items.push(makeMetaAdAccount({ customerId: 'customer-1', adAccountId: 'act_old' }))

    const result = await sut.execute({
      customerId: 'customer-1',
      adAccountId: 'act_new',
      pixelId: 'pixel-1',
    })

    expect(result.isRight()).toBe(true)
    expect(repo.items).toHaveLength(1)
    expect(repo.items[0].adAccountId).toBe('act_new')
    expect(repo.items[0].pixelId).toBe('pixel-1')
  })

  it('should handle multiple customers independently', async () => {
    await sut.execute({ customerId: 'customer-1', adAccountId: 'act_1' })
    await sut.execute({ customerId: 'customer-2', adAccountId: 'act_2' })

    expect(repo.items).toHaveLength(2)
  })
})
