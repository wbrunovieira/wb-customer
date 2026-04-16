import { describe, it, expect, beforeEach } from 'vitest'
import { GetMetaAdAccountUseCase } from './get-meta-ad-account.use-case'
import { InMemoryMetaAdAccountRepository } from './_test/in-memory-meta-ad-account.repository'
import { makeMetaAdAccount } from './_test/factories'

let repo: InMemoryMetaAdAccountRepository
let sut: GetMetaAdAccountUseCase

beforeEach(() => {
  repo = new InMemoryMetaAdAccountRepository()
  sut = new GetMetaAdAccountUseCase(repo)
})

describe('GetMetaAdAccountUseCase', () => {
  it('should return meta ad account when it exists', async () => {
    repo.items.push(makeMetaAdAccount({ customerId: 'customer-1', adAccountId: 'act_123' }))

    const result = await sut.execute({ customerId: 'customer-1' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.account.adAccountId).toBe('act_123')
    }
  })

  it('should return error when no account for customer', async () => {
    const result = await sut.execute({ customerId: 'non-existent' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('non-existent')
  })
})
