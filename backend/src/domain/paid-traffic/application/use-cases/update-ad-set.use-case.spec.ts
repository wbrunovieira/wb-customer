import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateAdSetUseCase } from './update-ad-set.use-case'
import { InMemoryAdSetRepository } from './_test/in-memory-ad-set.repository'
import { makeAdSet } from './_test/factories'

let repo: InMemoryAdSetRepository
let sut: UpdateAdSetUseCase

beforeEach(() => {
  repo = new InMemoryAdSetRepository()
  sut = new UpdateAdSetUseCase(repo)
})

describe('UpdateAdSetUseCase', () => {
  it('should update ad set fields', async () => {
    const adSet = makeAdSet({ name: 'Old Name' }, 'ad-set-1')
    await repo.save(adSet)

    const result = await sut.execute({
      adSetId: 'ad-set-1',
      name: 'New Name',
      dailyBudget: 200,
    })

    expect(result.isRight()).toBe(true)
    expect(repo.items[0].name).toBe('New Name')
    expect(repo.items[0].dailyBudget).toBe(200)
  })

  it('should return error when ad set not found', async () => {
    const result = await sut.execute({ adSetId: 'ghost', name: 'Test' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('ghost')
  })
})
