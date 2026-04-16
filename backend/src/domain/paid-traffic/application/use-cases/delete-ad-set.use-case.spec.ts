import { describe, it, expect, beforeEach } from 'vitest'
import { DeleteAdSetUseCase } from './delete-ad-set.use-case'
import { InMemoryAdSetRepository } from './_test/in-memory-ad-set.repository'
import { makeAdSet } from './_test/factories'

let repo: InMemoryAdSetRepository
let sut: DeleteAdSetUseCase

beforeEach(() => {
  repo = new InMemoryAdSetRepository()
  sut = new DeleteAdSetUseCase(repo)
})

describe('DeleteAdSetUseCase', () => {
  it('should delete an ad set', async () => {
    await repo.save(makeAdSet({}, 'ad-set-1'))

    const result = await sut.execute({ adSetId: 'ad-set-1' })

    expect(result.isRight()).toBe(true)
    expect(repo.items).toHaveLength(0)
  })

  it('should return error when ad set not found', async () => {
    const result = await sut.execute({ adSetId: 'ghost' })

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('ghost')
  })
})
