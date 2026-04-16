import { describe, it, expect, beforeEach } from 'vitest'
import { GetMetaConfigUseCase } from './get-meta-config.use-case'
import { InMemoryMetaConfigRepository } from './_test/in-memory-meta-config.repository'
import { makeMetaConfig } from './_test/factories'

let repo: InMemoryMetaConfigRepository
let sut: GetMetaConfigUseCase

beforeEach(() => {
  repo = new InMemoryMetaConfigRepository()
  sut = new GetMetaConfigUseCase(repo)
})

describe('GetMetaConfigUseCase', () => {
  it('should return meta config when it exists', async () => {
    repo.item = makeMetaConfig({ appId: 'app-123', bmId: 'bm-456' })

    const result = await sut.execute()

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.config.appId).toBe('app-123')
      expect(result.value.config.bmId).toBe('bm-456')
    }
  })

  it('should return error when config does not exist', async () => {
    const result = await sut.execute()

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toBe('Meta config not found')
  })
})
