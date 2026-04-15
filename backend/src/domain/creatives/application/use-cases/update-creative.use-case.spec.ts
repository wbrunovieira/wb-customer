import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateCreativeUseCase } from './update-creative.use-case'
import { InMemoryCreativeRepository } from './_test/in-memory-creative.repository'
import { makeCreative } from './_test/factories'

let repo: InMemoryCreativeRepository
let sut: UpdateCreativeUseCase

beforeEach(() => {
  repo = new InMemoryCreativeRepository()
  sut = new UpdateCreativeUseCase(repo)
})

describe('UpdateCreativeUseCase', () => {
  it('should update title and caption', async () => {
    const creative = makeCreative({ customerId: 'cust-1', title: 'Old Title' })
    await repo.save(creative)

    const result = await sut.execute({
      customerId: 'cust-1',
      creativeId: creative.id.value,
      title: 'New Title',
      caption: 'Nova legenda',
    })

    expect(result.isRight()).toBe(true)
    const updated = await repo.findById(creative.id.value)
    expect(updated?.title).toBe('New Title')
    expect(updated?.caption).toBe('Nova legenda')
  })

  it('should update status', async () => {
    const creative = makeCreative({ customerId: 'cust-1' })
    await repo.save(creative)

    await sut.execute({
      customerId: 'cust-1',
      creativeId: creative.id.value,
      status: 'active',
    })

    const updated = await repo.findById(creative.id.value)
    expect(updated?.status).toBe('active')
  })

  it('should return error when creative does not exist', async () => {
    const result = await sut.execute({
      customerId: 'cust-1',
      creativeId: 'ghost',
      title: 'X',
    })
    expect(result.isLeft()).toBe(true)
  })

  it('should return error when creative belongs to another customer', async () => {
    const creative = makeCreative({ customerId: 'other' })
    await repo.save(creative)

    const result = await sut.execute({
      customerId: 'cust-1',
      creativeId: creative.id.value,
      title: 'Hack',
    })
    expect(result.isLeft()).toBe(true)
  })

  it('should not update fields that were not provided', async () => {
    const creative = makeCreative({
      customerId: 'cust-1',
      title: 'Original',
      caption: 'Original caption',
    })
    await repo.save(creative)

    await sut.execute({ customerId: 'cust-1', creativeId: creative.id.value, title: 'Updated' })

    const updated = await repo.findById(creative.id.value)
    expect(updated?.caption).toBe('Original caption')
  })
})
