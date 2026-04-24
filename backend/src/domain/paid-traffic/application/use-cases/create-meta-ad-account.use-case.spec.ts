import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreateMetaAdAccountUseCase } from './create-meta-ad-account.use-case'
import { InMemoryMetaConfigRepository } from './_test/in-memory-meta-config.repository'
import { MetaConfig } from '../../enterprise/entities/meta-config'
import { IAdPlatformAdapter, CreateMetaAdAccountParams } from '../services/i-ad-platform.adapter'

class StubAdapter extends IAdPlatformAdapter {
  createAdAccount = vi.fn(async (_p: CreateMetaAdAccountParams) => ({
    id: 'act_999888777',
    name: _p.name,
  }))
  createCampaign = vi.fn(async () => ({ externalId: '' }))
  createAdSet = vi.fn(async () => ({ externalId: '' }))
  uploadImage = vi.fn(async () => ({ imageHash: '', url: '' }))
  createAd = vi.fn(async () => ({ externalId: '', creativeId: '' }))
  pauseCampaign = vi.fn(async () => {})
  resumeCampaign = vi.fn(async () => {})
  syncMetrics = vi.fn(async () => [])
  listAdAccounts = vi.fn(async () => [])
}

describe('CreateMetaAdAccountUseCase', () => {
  let repo: InMemoryMetaConfigRepository
  let adapter: StubAdapter
  let sut: CreateMetaAdAccountUseCase

  beforeEach(() => {
    repo = new InMemoryMetaConfigRepository()
    adapter = new StubAdapter()
    sut = new CreateMetaAdAccountUseCase(repo, adapter)
  })

  it('returns error when meta config is not set', async () => {
    const result = await sut.execute({ name: 'Salto Up' })
    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(Error)
  })

  it('creates ad account using BM ID from config', async () => {
    repo.item = MetaConfig.create({
      appId: 'app1',
      appSecret: 'secret',
      systemUserToken: 'token',
      bmId: '241211539874283',
    })

    const result = await sut.execute({ name: 'Salto Up Ads' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.id).toBe('act_999888777')
      expect(result.value.name).toBe('Salto Up Ads')
    }
    expect(adapter.createAdAccount).toHaveBeenCalledWith(
      expect.objectContaining({ bmId: '241211539874283', name: 'Salto Up Ads' }),
    )
  })

  it('forwards optional currency and timezoneId', async () => {
    repo.item = MetaConfig.create({
      appId: 'app1',
      appSecret: 'secret',
      systemUserToken: 'token',
      bmId: '241211539874283',
    })

    await sut.execute({ name: 'Test', currency: 'USD', timezoneId: 1, endAdvertiser: 'page_123' })

    expect(adapter.createAdAccount).toHaveBeenCalledWith({
      bmId: '241211539874283',
      name: 'Test',
      currency: 'USD',
      timezoneId: 1,
      endAdvertiser: 'page_123',
    })
  })

  it('returns error when adapter throws', async () => {
    repo.item = MetaConfig.create({
      appId: 'app1',
      appSecret: 'secret',
      systemUserToken: 'token',
      bmId: '241211539874283',
    })
    adapter.createAdAccount.mockRejectedValueOnce(new Error('Meta API error'))

    const result = await sut.execute({ name: 'Fail' })
    expect(result.isLeft()).toBe(true)
  })
})
