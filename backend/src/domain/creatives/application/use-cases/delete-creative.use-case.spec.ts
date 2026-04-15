import { describe, it, expect, beforeEach } from 'vitest'
import { DeleteCreativeUseCase } from './delete-creative.use-case'
import { InMemoryCreativeRepository } from './_test/in-memory-creative.repository'
import { makeCreative } from './_test/factories'

let repo: InMemoryCreativeRepository
let sut: DeleteCreativeUseCase

beforeEach(() => {
  repo = new InMemoryCreativeRepository()
  sut = new DeleteCreativeUseCase(repo)
})

describe('DeleteCreativeUseCase', () => {
  it('should soft-delete the creative', async () => {
    const creative = makeCreative({ customerId: 'cust-1' })
    await repo.save(creative)

    const result = await sut.execute({ customerId: 'cust-1', creativeId: creative.id.value })

    expect(result.isRight()).toBe(true)
    const found = await repo.findById(creative.id.value)
    expect(found?.isDeleted).toBe(true)
  })

  it('should return error when creative does not exist', async () => {
    const result = await sut.execute({ customerId: 'cust-1', creativeId: 'ghost' })
    expect(result.isLeft()).toBe(true)
  })

  it('should return error when creative belongs to another customer', async () => {
    const creative = makeCreative({ customerId: 'other' })
    await repo.save(creative)

    const result = await sut.execute({ customerId: 'cust-1', creativeId: creative.id.value })
    expect(result.isLeft()).toBe(true)
  })
})
