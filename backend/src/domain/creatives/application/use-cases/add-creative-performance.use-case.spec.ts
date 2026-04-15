import { describe, it, expect, beforeEach } from 'vitest'
import { AddCreativePerformanceUseCase } from './add-creative-performance.use-case'
import { InMemoryCreativeRepository } from './_test/in-memory-creative.repository'
import { InMemoryCreativePerformanceRepository } from './_test/in-memory-creative-performance.repository'
import { makeCreative } from './_test/factories'

let creativeRepo: InMemoryCreativeRepository
let performanceRepo: InMemoryCreativePerformanceRepository
let sut: AddCreativePerformanceUseCase

beforeEach(() => {
  creativeRepo = new InMemoryCreativeRepository()
  performanceRepo = new InMemoryCreativePerformanceRepository()
  sut = new AddCreativePerformanceUseCase(creativeRepo, performanceRepo)
})

describe('AddCreativePerformanceUseCase', () => {
  it('should create a performance record for the creative', async () => {
    const creative = makeCreative({ customerId: 'cust-1' })
    await creativeRepo.save(creative)

    const result = await sut.execute({
      customerId: 'cust-1',
      creativeId: creative.id.value,
      platform: 'facebook',
      impressions: 10000,
      clicks: 320,
      conversions: 15,
      spend: 250.00,
      ctr: 3.2,
      cpc: 0.78,
      cpa: 16.67,
      roas: 4.5,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-04-05'),
    })

    expect(result.isRight()).toBe(true)
    expect(performanceRepo.items).toHaveLength(1)
    expect(performanceRepo.items[0].platform).toBe('facebook')
    expect(performanceRepo.items[0].impressions).toBe(10000)
  })

  it('should return a performanceId', async () => {
    const creative = makeCreative({ customerId: 'cust-1' })
    await creativeRepo.save(creative)

    const result = await sut.execute({
      customerId: 'cust-1',
      creativeId: creative.id.value,
      platform: 'instagram',
      impressions: 5000,
      clicks: 100,
      conversions: 5,
      spend: 120.00,
      startDate: new Date('2026-04-01'),
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.performanceId).toBeTruthy()
    }
  })

  it('should return error when creative does not exist', async () => {
    const result = await sut.execute({
      customerId: 'cust-1',
      creativeId: 'ghost',
      platform: 'facebook',
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      startDate: new Date(),
    })

    expect(result.isLeft()).toBe(true)
  })

  it('should return error when creative belongs to another customer', async () => {
    const creative = makeCreative({ customerId: 'other' })
    await creativeRepo.save(creative)

    const result = await sut.execute({
      customerId: 'cust-1',
      creativeId: creative.id.value,
      platform: 'facebook',
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      startDate: new Date(),
    })

    expect(result.isLeft()).toBe(true)
  })
})
