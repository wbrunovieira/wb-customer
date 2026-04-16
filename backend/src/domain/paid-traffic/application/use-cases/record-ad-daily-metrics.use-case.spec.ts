import { describe, it, expect, beforeEach } from 'vitest'
import { RecordAdDailyMetricsUseCase } from './record-ad-daily-metrics.use-case'
import { InMemoryAdDailyMetricRepository } from './_test/in-memory-ad-daily-metric.repository'

let repo: InMemoryAdDailyMetricRepository
let sut: RecordAdDailyMetricsUseCase

beforeEach(() => {
  repo = new InMemoryAdDailyMetricRepository()
  sut = new RecordAdDailyMetricsUseCase(repo)
})

describe('RecordAdDailyMetricsUseCase', () => {
  it('should create metric when none exists for (adId, date)', async () => {
    const result = await sut.execute({
      adId: 'ad-1',
      campaignId: 'campaign-1',
      date: new Date('2026-04-01'),
      impressions: 1000,
      clicks: 50,
      reach: 900,
      spent: 25.5,
      conversions: 5,
      results: 5,
    })

    expect(result.isRight()).toBe(true)
    expect(repo.items).toHaveLength(1)
    expect(repo.items[0].impressions).toBe(1000)
  })

  it('should upsert metric for same (adId, date)', async () => {
    const date = new Date('2026-04-01')

    await sut.execute({
      adId: 'ad-1',
      campaignId: 'campaign-1',
      date,
      impressions: 1000,
      clicks: 50,
      reach: 900,
      spent: 25.5,
      conversions: 5,
      results: 5,
    })

    await sut.execute({
      adId: 'ad-1',
      campaignId: 'campaign-1',
      date,
      impressions: 2000,
      clicks: 100,
      reach: 1800,
      spent: 50,
      conversions: 10,
      results: 10,
    })

    expect(repo.items).toHaveLength(1)
    expect(repo.items[0].impressions).toBe(2000)
  })

  it('should store optional metric fields', async () => {
    const result = await sut.execute({
      adId: 'ad-1',
      campaignId: 'campaign-1',
      date: new Date('2026-04-01'),
      impressions: 1000,
      clicks: 50,
      reach: 900,
      spent: 25,
      conversions: 5,
      results: 5,
      ctr: 5.0,
      cpc: 0.5,
      roas: 3.2,
    })

    expect(result.isRight()).toBe(true)
    expect(repo.items[0].ctr).toBe(5.0)
    expect(repo.items[0].roas).toBe(3.2)
  })
})
