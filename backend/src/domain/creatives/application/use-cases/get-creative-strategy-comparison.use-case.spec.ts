import { describe, it, expect, beforeEach } from 'vitest'
import { GetCreativeStrategyComparisonUseCase } from './get-creative-strategy-comparison.use-case'
import { InMemoryCreativeStrategyRepository } from './_test/in-memory-creative-strategy.repository'
import { InMemoryCreativeRepository } from './_test/in-memory-creative.repository'
import { InMemoryCreativePerformanceRepository } from './_test/in-memory-creative-performance.repository'
import { makeCreative, makeStrategy } from './_test/factories'
import { CreativeStrategyNotFoundError } from '../../domain/exceptions/creative-strategy-not-found.error'

describe('GetCreativeStrategyComparisonUseCase', () => {
  let strategyRepo: InMemoryCreativeStrategyRepository
  let creativeRepo: InMemoryCreativeRepository
  let performanceRepo: InMemoryCreativePerformanceRepository
  let sut: GetCreativeStrategyComparisonUseCase

  const perf = (creativeId: string, over: Partial<Record<string, number>> = {}) => ({
    creativeId,
    platform: 'meta',
    campaignId: 'campaign-1',
    source: 'meta_sync',
    impressions: over.impressions ?? 1000,
    clicks: over.clicks ?? 50,
    conversions: over.conversions ?? 10,
    spend: over.spend ?? 100,
    ctr: over.ctr ?? 5,
    cpc: over.cpc ?? 2,
    cpa: over.cpa ?? 10,
    roas: over.roas ?? 0.1,
    startDate: new Date('2026-09-01T00:00:00.000Z'),
  })

  beforeEach(async () => {
    strategyRepo = new InMemoryCreativeStrategyRepository()
    creativeRepo = new InMemoryCreativeRepository()
    performanceRepo = new InMemoryCreativePerformanceRepository()
    sut = new GetCreativeStrategyComparisonUseCase(strategyRepo, creativeRepo, performanceRepo)

    await creativeRepo.save(makeCreative({ title: 'Criativo A' }, 'creative-A'))
    await creativeRepo.save(makeCreative({ title: 'Criativo B' }, 'creative-B'))

    const strategy = makeStrategy({}, 'strategy-1')
    strategy.addItem('creative-A', 0)
    strategy.addItem('creative-B', 1)
    await strategyRepo.save(strategy)
  })

  it('devolve uma entrada por criativo da estratégia, na ordem das posições', async () => {
    const result = await sut.execute({ customerId: 'customer-1', strategyId: 'strategy-1' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.entries).toHaveLength(2)
      expect(result.value.entries.map((e) => e.creative.id.value)).toEqual([
        'creative-A',
        'creative-B',
      ])
    }
  })

  it('agrega os registros de performance de cada criativo', async () => {
    await performanceRepo.create(perf('creative-A', { impressions: 1000, clicks: 40, spend: 100, conversions: 4 }))
    await performanceRepo.create(perf('creative-A', { impressions: 3000, clicks: 60, spend: 200, conversions: 6 }))

    const result = await sut.execute({ customerId: 'customer-1', strategyId: 'strategy-1' })

    if (result.isRight()) {
      const [entryA] = result.value.entries
      expect(entryA.totals.recordCount).toBe(2)
      expect(entryA.totals.impressions).toBe(4000)
      expect(entryA.totals.clicks).toBe(100)
      expect(entryA.totals.spend).toBe(300)
      expect(entryA.totals.conversions).toBe(10)
    }
  })

  it('calcula as taxas a partir dos totais, não pela média das taxas de cada registro', async () => {
    // Um registro grande com CTR baixo e um pequeno com CTR alto: a média simples
    // daria 15%, mas o CTR real do conjunto é 100/10100 ≈ 0,99%.
    await performanceRepo.create(perf('creative-A', { impressions: 10000, clicks: 100, ctr: 1 }))
    await performanceRepo.create(perf('creative-A', { impressions: 100, clicks: 29, ctr: 29 }))

    const result = await sut.execute({ customerId: 'customer-1', strategyId: 'strategy-1' })

    if (result.isRight()) {
      const [entryA] = result.value.entries
      expect(entryA.totals.ctr).toBeCloseTo(1.2772, 3)
      expect(entryA.totals.ctr).not.toBeCloseTo(15, 1)
    }
  })

  it('inclui criativo sem nenhuma métrica, com totais zerados e taxas nulas', async () => {
    const result = await sut.execute({ customerId: 'customer-1', strategyId: 'strategy-1' })

    if (result.isRight()) {
      const [, entryB] = result.value.entries
      expect(entryB.totals.recordCount).toBe(0)
      expect(entryB.totals.impressions).toBe(0)
      expect(entryB.totals.ctr).toBeNull()
      expect(entryB.totals.cpa).toBeNull()
    }
  })

  it('marca o campeão já escolhido na estratégia', async () => {
    const strategy = makeStrategy({ winnerId: 'creative-B' }, 'strategy-2')
    strategy.addItem('creative-A', 0)
    strategy.addItem('creative-B', 1)
    await strategyRepo.save(strategy)

    const result = await sut.execute({ customerId: 'customer-1', strategyId: 'strategy-2' })

    if (result.isRight()) {
      expect(result.value.entries.find((e) => e.creative.id.value === 'creative-A')?.isWinner).toBe(false)
      expect(result.value.entries.find((e) => e.creative.id.value === 'creative-B')?.isWinner).toBe(true)
    }
  })

  it('aponta o líder de cada métrica — melhor CTR, melhor ROAS e mais conversões', async () => {
    await performanceRepo.create(perf('creative-A', { impressions: 1000, clicks: 100, conversions: 5, spend: 100 }))
    await performanceRepo.create(perf('creative-B', { impressions: 1000, clicks: 20, conversions: 40, spend: 100 }))

    const result = await sut.execute({ customerId: 'customer-1', strategyId: 'strategy-1' })

    if (result.isRight()) {
      expect(result.value.highlights.bestCtr).toBe('creative-A')
      expect(result.value.highlights.mostConversions).toBe('creative-B')
      expect(result.value.highlights.bestRoas).toBe('creative-B')
    }
  })

  it('trata CPA como menor-é-melhor', async () => {
    // A gasta 100 por 5 conversões (CPA 20); B gasta 100 por 20 conversões (CPA 5).
    await performanceRepo.create(perf('creative-A', { conversions: 5, spend: 100 }))
    await performanceRepo.create(perf('creative-B', { conversions: 20, spend: 100 }))

    const result = await sut.execute({ customerId: 'customer-1', strategyId: 'strategy-1' })

    if (result.isRight()) {
      expect(result.value.highlights.bestCpa).toBe('creative-B')
    }
  })

  it('não elege líder entre criativos sem dado nenhum', async () => {
    const result = await sut.execute({ customerId: 'customer-1', strategyId: 'strategy-1' })

    if (result.isRight()) {
      expect(result.value.highlights.bestCtr).toBeNull()
      expect(result.value.highlights.bestCpa).toBeNull()
      expect(result.value.highlights.bestRoas).toBeNull()
      expect(result.value.highlights.mostConversions).toBeNull()
    }
  })

  it('ignora criativo removido que ainda esteja vinculado à estratégia', async () => {
    await creativeRepo.softDelete('creative-B')

    const result = await sut.execute({ customerId: 'customer-1', strategyId: 'strategy-1' })

    if (result.isRight()) {
      expect(result.value.entries).toHaveLength(1)
      expect(result.value.entries[0].creative.id.value).toBe('creative-A')
    }
  })

  it('retorna left quando a estratégia não existe', async () => {
    const result = await sut.execute({ customerId: 'customer-1', strategyId: 'nao-existe' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(CreativeStrategyNotFoundError)
  })

  it('retorna left quando a estratégia pertence a outro cliente', async () => {
    const result = await sut.execute({ customerId: 'outro-cliente', strategyId: 'strategy-1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(CreativeStrategyNotFoundError)
  })
})
