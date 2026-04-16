import { describe, it, expect, beforeEach } from 'vitest'
import { DeleteAdUseCase } from './delete-ad.use-case'
import { InMemoryAdRepository } from './_test/in-memory-ad.repository'
import { makeAd } from './_test/factories'

let repo: InMemoryAdRepository
let sut: DeleteAdUseCase

beforeEach(() => {
  repo = new InMemoryAdRepository()
  sut = new DeleteAdUseCase(repo)
})

describe('DeleteAdUseCase', () => {
  it('should delete an ad', async () => {
    await repo.save(makeAd({}, 'ad-1'))

    const result = await sut.execute({ adId: 'ad-1' })

    expect(result.isRight()).toBe(true)
    expect(repo.items).toHaveLength(0)
  })

  it('should return error when ad not found', async () => {
    const result = await sut.execute({ adId: 'ghost' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('ghost')
  })
})
