import { describe, it, expect, beforeEach } from 'vitest'
import { CreateAdUseCase } from './create-ad.use-case'
import { InMemoryAdRepository } from './_test/in-memory-ad.repository'
import { InMemoryAdSetRepository } from './_test/in-memory-ad-set.repository'
import { makeAdSet } from './_test/factories'

let adRepo: InMemoryAdRepository
let adSetRepo: InMemoryAdSetRepository
let sut: CreateAdUseCase

beforeEach(() => {
  adRepo = new InMemoryAdRepository()
  adSetRepo = new InMemoryAdSetRepository()
  sut = new CreateAdUseCase(adRepo, adSetRepo)
})

describe('CreateAdUseCase', () => {
  it('should create an ad with defaults', async () => {
    const adSet = makeAdSet({}, 'ad-set-1')
    await adSetRepo.save(adSet)

    const result = await sut.execute({
      adSetId: 'ad-set-1',
      name: 'Brand Ad',
      primaryText: 'Check this out',
      headline: 'Big Sale',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const ad = adRepo.items[0]
      expect(ad.name).toBe('Brand Ad')
      expect(ad.callToAction).toBe('LEARN_MORE')
      expect(ad.publishStatus).toBe('draft')
      expect(result.value.adId).toBe(ad.id.value)
    }
  })

  it('should return error when ad set not found', async () => {
    const result = await sut.execute({ adSetId: 'ghost', name: 'Test Ad' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('ghost')
  })

  it('should persist custom callToAction', async () => {
    await adSetRepo.save(makeAdSet({}, 'ad-set-1'))

    await sut.execute({
      adSetId: 'ad-set-1',
      name: 'Shop Ad',
      callToAction: 'SHOP_NOW',
    })

    expect(adRepo.items[0].callToAction).toBe('SHOP_NOW')
  })
})
