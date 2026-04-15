import { describe, it, expect, beforeEach } from 'vitest'
import { ListCreativesUseCase } from './list-creatives.use-case'
import { InMemoryCreativeRepository } from './_test/in-memory-creative.repository'
import { makeCreative } from './_test/factories'

let repo: InMemoryCreativeRepository
let sut: ListCreativesUseCase

beforeEach(() => {
  repo = new InMemoryCreativeRepository()
  sut = new ListCreativesUseCase(repo)
})

describe('ListCreativesUseCase', () => {
  it('should return all non-deleted creatives for a customer', async () => {
    await repo.save(makeCreative({ customerId: 'cust-1', title: 'A' }))
    await repo.save(makeCreative({ customerId: 'cust-1', title: 'B' }))
    await repo.save(makeCreative({ customerId: 'cust-2', title: 'Other' }))

    const result = await sut.execute({ customerId: 'cust-1' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(2)
      expect(result.value.total).toBe(2)
    }
  })

  it('should filter by type', async () => {
    await repo.save(makeCreative({ customerId: 'cust-1', type: 'image' }))
    await repo.save(makeCreative({ customerId: 'cust-1', type: 'video' }))
    await repo.save(makeCreative({ customerId: 'cust-1', type: 'video' }))

    const result = await sut.execute({ customerId: 'cust-1', type: 'video' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(2)
      expect(result.value.items.every((c) => c.type === 'video')).toBe(true)
    }
  })

  it('should filter by status', async () => {
    await repo.save(makeCreative({ customerId: 'cust-1', status: 'draft' }))
    await repo.save(makeCreative({ customerId: 'cust-1', status: 'active' }))

    const result = await sut.execute({ customerId: 'cust-1', status: 'active' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(1)
      expect(result.value.items[0].status).toBe('active')
    }
  })

  it('should exclude soft-deleted creatives', async () => {
    const deleted = makeCreative({ customerId: 'cust-1' })
    deleted.softDelete()
    await repo.save(deleted)
    await repo.save(makeCreative({ customerId: 'cust-1' }))

    const result = await sut.execute({ customerId: 'cust-1' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(1)
    }
  })

  it('should return empty list when customer has no creatives', async () => {
    const result = await sut.execute({ customerId: 'empty-cust' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.items).toHaveLength(0)
      expect(result.value.total).toBe(0)
    }
  })
})
