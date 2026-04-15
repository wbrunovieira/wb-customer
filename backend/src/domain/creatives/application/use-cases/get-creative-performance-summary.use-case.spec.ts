import { describe, it, expect, beforeEach } from 'vitest'
import { GetCreativePerformanceSummaryUseCase } from './get-creative-performance-summary.use-case'
import { InMemoryCreativeRepository } from './_test/in-memory-creative.repository'
import { InMemoryCreativePerformanceRepository } from './_test/in-memory-creative-performance.repository'
import { makeCreative } from './_test/factories'

let creativeRepo: InMemoryCreativeRepository
let performanceRepo: InMemoryCreativePerformanceRepository
let sut: GetCreativePerformanceSummaryUseCase

beforeEach(() => {
  creativeRepo = new InMemoryCreativeRepository()
  performanceRepo = new InMemoryCreativePerformanceRepository()
  sut = new GetCreativePerformanceSummaryUseCase(creativeRepo, performanceRepo)
})

describe('GetCreativePerformanceSummaryUseCase', () => {
  it('should return zeros when no performance records exist', async () => {
    const creative = makeCreative({ customerId: 'cust-1' })
    await creativeRepo.save(creative)

    const result = await sut.execute({ customerId: 'cust-1', creativeId: creative.id.value })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const { summary } = result.value
      expect(summary.recordCount).toBe(0)
      expect(summary.totalImpressions).toBe(0)
      expect(summary.totalClicks).toBe(0)
      expect(summary.totalConversions).toBe(0)
      expect(summary.totalSpend).toBe(0)
      expect(summary.avgCtr).toBeNull()
      expect(summary.avgRoas).toBeNull()
      expect(summary.platforms).toHaveLength(0)
    }
  })

  it('should aggregate totals across multiple records', async () => {
    const creative = makeCreative({ customerId: 'cust-1' })
    await creativeRepo.save(creative)

    await performanceRepo.create({
      creativeId: creative.id.value,
      platform: 'facebook',
      impressions: 10000,
      clicks: 300,
      conversions: 10,
      spend: 200,
      ctr: 3.0,
      cpc: 0.67,
      cpa: 20,
      roas: 4.0,
      startDate: new Date('2026-04-01'),
    })

    await performanceRepo.create({
      creativeId: creative.id.value,
      platform: 'instagram',
      impressions: 5000,
      clicks: 100,
      conversions: 5,
      spend: 100,
      ctr: 2.0,
      cpc: 1.0,
      cpa: 20,
      roas: 3.0,
      startDate: new Date('2026-04-06'),
    })

    const result = await sut.execute({ customerId: 'cust-1', creativeId: creative.id.value })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const { summary } = result.value
      expect(summary.recordCount).toBe(2)
      expect(summary.totalImpressions).toBe(15000)
      expect(summary.totalClicks).toBe(400)
      expect(summary.totalConversions).toBe(15)
      expect(summary.totalSpend).toBe(300)
      expect(summary.avgCtr).toBeCloseTo(2.5)
      expect(summary.avgRoas).toBeCloseTo(3.5)
      expect(summary.platforms).toContain('facebook')
      expect(summary.platforms).toContain('instagram')
    }
  })

  it('should compute averages only from non-null values', async () => {
    const creative = makeCreative({ customerId: 'cust-1' })
    await creativeRepo.save(creative)

    await performanceRepo.create({
      creativeId: creative.id.value,
      platform: 'facebook',
      impressions: 1000,
      clicks: 50,
      conversions: 2,
      spend: 80,
      ctr: 5.0,
      cpc: null,
      cpa: null,
      roas: null,
      startDate: new Date('2026-04-01'),
    })

    const result = await sut.execute({ customerId: 'cust-1', creativeId: creative.id.value })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const { summary } = result.value
      expect(summary.avgCtr).toBeCloseTo(5.0)
      expect(summary.avgCpc).toBeNull()
      expect(summary.avgRoas).toBeNull()
    }
  })

  it('should return error when creative does not exist', async () => {
    const result = await sut.execute({ customerId: 'cust-1', creativeId: 'ghost' })
    expect(result.isLeft()).toBe(true)
  })

  it('should return error when creative belongs to another customer', async () => {
    const creative = makeCreative({ customerId: 'other' })
    await creativeRepo.save(creative)

    const result = await sut.execute({ customerId: 'cust-1', creativeId: creative.id.value })
    expect(result.isLeft()).toBe(true)
  })
})
