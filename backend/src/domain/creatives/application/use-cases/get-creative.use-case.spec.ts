import { describe, it, expect, beforeEach } from 'vitest'
import { GetCreativeUseCase } from './get-creative.use-case'
import { InMemoryCreativeRepository } from './_test/in-memory-creative.repository'
import { makeCreative } from './_test/factories'

let repo: InMemoryCreativeRepository
let sut: GetCreativeUseCase

beforeEach(() => {
  repo = new InMemoryCreativeRepository()
  sut = new GetCreativeUseCase(repo)
})

describe('GetCreativeUseCase', () => {
  it('should return the creative when found', async () => {
    const creative = makeCreative({ customerId: 'cust-1', title: 'Banner Hero' })
    await repo.save(creative)

    const result = await sut.execute({ customerId: 'cust-1', creativeId: creative.id.value })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.creative.title).toBe('Banner Hero')
    }
  })

  it('should return error when creative does not exist', async () => {
    const result = await sut.execute({ customerId: 'cust-1', creativeId: 'ghost' })
    expect(result.isLeft()).toBe(true)
  })

  it('should return error when creative belongs to another customer', async () => {
    const creative = makeCreative({ customerId: 'other-cust' })
    await repo.save(creative)

    const result = await sut.execute({ customerId: 'cust-1', creativeId: creative.id.value })
    expect(result.isLeft()).toBe(true)
  })

  it('should return error for soft-deleted creative', async () => {
    const creative = makeCreative({ customerId: 'cust-1' })
    creative.softDelete()
    await repo.save(creative)

    const result = await sut.execute({ customerId: 'cust-1', creativeId: creative.id.value })
    expect(result.isLeft()).toBe(true)
  })
})
