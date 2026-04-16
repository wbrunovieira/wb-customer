import { describe, it, expect, beforeEach } from 'vitest'
import { SaveMetaConfigUseCase } from './save-meta-config.use-case'
import { InMemoryMetaConfigRepository } from './_test/in-memory-meta-config.repository'
import { makeMetaConfig } from './_test/factories'

let repo: InMemoryMetaConfigRepository
let sut: SaveMetaConfigUseCase

beforeEach(() => {
  repo = new InMemoryMetaConfigRepository()
  sut = new SaveMetaConfigUseCase(repo)
})

describe('SaveMetaConfigUseCase', () => {
  it('should create meta config when it does not exist', async () => {
    const result = await sut.execute({
      appId: 'app-1',
      appSecret: 'secret-1',
      systemUserToken: 'token-1',
      bmId: 'bm-1',
    })

    expect(result.isRight()).toBe(true)
    expect(repo.item).not.toBeNull()
    expect(repo.item?.appId).toBe('app-1')
    expect(repo.item?.bmId).toBe('bm-1')
  })

  it('should update existing meta config', async () => {
    repo.item = makeMetaConfig({ appId: 'old-app' })

    const result = await sut.execute({
      appId: 'new-app',
      appSecret: 'new-secret',
      systemUserToken: 'new-token',
      bmId: 'new-bm',
    })

    expect(result.isRight()).toBe(true)
    expect(repo.item?.appId).toBe('new-app')
    expect(repo.item?.appSecret).toBe('new-secret')
  })

  it('should always return success: true', async () => {
    const result = await sut.execute({
      appId: 'app-1',
      appSecret: 'secret-1',
      systemUserToken: 'token-1',
      bmId: 'bm-1',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.success).toBe(true)
    }
  })
})
