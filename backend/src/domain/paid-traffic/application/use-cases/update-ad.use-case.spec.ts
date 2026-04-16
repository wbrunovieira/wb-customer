import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateAdUseCase } from './update-ad.use-case'
import { InMemoryAdRepository } from './_test/in-memory-ad.repository'
import { makeAd } from './_test/factories'

let repo: InMemoryAdRepository
let sut: UpdateAdUseCase

beforeEach(() => {
  repo = new InMemoryAdRepository()
  sut = new UpdateAdUseCase(repo)
})

describe('UpdateAdUseCase', () => {
  it('should update ad fields', async () => {
    const ad = makeAd({ name: 'Old Name' }, 'ad-1')
    await repo.save(ad)

    const result = await sut.execute({
      adId: 'ad-1',
      name: 'New Name',
      headline: 'New Headline',
      callToAction: 'SIGN_UP',
    })

    expect(result.isRight()).toBe(true)
    expect(repo.items[0].name).toBe('New Name')
    expect(repo.items[0].headline).toBe('New Headline')
    expect(repo.items[0].callToAction).toBe('SIGN_UP')
  })

  it('should return error when ad not found', async () => {
    const result = await sut.execute({ adId: 'ghost', name: 'Test' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('ghost')
  })
})
