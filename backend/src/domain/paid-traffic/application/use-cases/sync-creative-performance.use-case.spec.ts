import { describe, it, expect, beforeEach } from 'vitest'
import { SyncCreativePerformanceUseCase } from './sync-creative-performance.use-case'
import { InMemoryCampaignRepository } from './_test/in-memory-campaign.repository'
import { InMemoryAdSetRepository } from './_test/in-memory-ad-set.repository'
import { InMemoryAdRepository } from './_test/in-memory-ad.repository'
import { InMemoryAdDailyMetricRepository } from './_test/in-memory-ad-daily-metric.repository'
import { InMemoryCreativePerformanceRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-creative-performance.repository'
import { makeCampaign, makeAdSet, makeAd } from './_test/factories'

describe('SyncCreativePerformanceUseCase', () => {
  let campaignRepo: InMemoryCampaignRepository
  let adSetRepo: InMemoryAdSetRepository
  let adRepo: InMemoryAdRepository
  let metricRepo: InMemoryAdDailyMetricRepository
  let performanceRepo: InMemoryCreativePerformanceRepository
  let sut: SyncCreativePerformanceUseCase

  const day = (d: string) => new Date(`${d}T00:00:00.000Z`)

  beforeEach(async () => {
    campaignRepo = new InMemoryCampaignRepository()
    adSetRepo = new InMemoryAdSetRepository()
    adRepo = new InMemoryAdRepository()
    metricRepo = new InMemoryAdDailyMetricRepository()
    performanceRepo = new InMemoryCreativePerformanceRepository()
    sut = new SyncCreativePerformanceUseCase(
      campaignRepo,
      adSetRepo,
      adRepo,
      metricRepo,
      performanceRepo,
    )

    await campaignRepo.save(makeCampaign({ customerId: 'customer-1' }, 'campaign-1'))
    await adSetRepo.save(makeAdSet({ campaignId: 'campaign-1' }, 'adset-1'))
    await adRepo.save(makeAd({ adSetId: 'adset-1', creativeId: 'creative-A' }, 'ad-1'))
    await adRepo.save(makeAd({ adSetId: 'adset-1', creativeId: 'creative-A' }, 'ad-2'))
    await adRepo.save(makeAd({ adSetId: 'adset-1', creativeId: 'creative-B' }, 'ad-3'))
  })

  const metric = (adId: string, date: string, over: Partial<Record<string, number>> = {}) => ({
    adId,
    campaignId: 'campaign-1',
    date: day(date),
    impressions: over.impressions ?? 1000,
    clicks: over.clicks ?? 50,
    reach: over.reach ?? 800,
    spent: over.spent ?? 100,
    conversions: over.conversions ?? 5,
    results: over.results ?? 5,
  })

  it('agrega as métricas de todos os anúncios que usam o mesmo criativo', async () => {
    await metricRepo.upsert(metric('ad-1', '2026-09-01'))
    await metricRepo.upsert(metric('ad-2', '2026-09-01'))

    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isRight()).toBe(true)
    const rows = await performanceRepo.findByCreativeId('creative-A')
    expect(rows).toHaveLength(1)
    expect(rows[0].impressions).toBe(2000)
    expect(rows[0].clicks).toBe(100)
    expect(rows[0].spend).toBe(200)
    expect(rows[0].conversions).toBe(10)
  })

  it('cria uma linha por criativo da campanha', async () => {
    await metricRepo.upsert(metric('ad-1', '2026-09-01'))
    await metricRepo.upsert(metric('ad-3', '2026-09-01'))

    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isRight() && result.value.synced).toBe(2)
    expect(await performanceRepo.findByCreativeId('creative-A')).toHaveLength(1)
    expect(await performanceRepo.findByCreativeId('creative-B')).toHaveLength(1)
  })

  it('calcula ctr, cpc, cpa e roas com as mesmas fórmulas do dashboard de campanha', async () => {
    await metricRepo.upsert(
      metric('ad-1', '2026-09-01', {
        impressions: 1000,
        clicks: 50,
        spent: 200,
        conversions: 10,
      }),
    )

    await sut.execute({ campaignId: 'campaign-1' })

    const [row] = await performanceRepo.findByCreativeId('creative-A')
    expect(row.ctr).toBeCloseTo(5)
    expect(row.cpc).toBeCloseTo(4)
    expect(row.cpa).toBeCloseTo(20)
    expect(row.roas).toBeCloseTo(0.05)
  })

  it('deixa as taxas nulas quando o denominador é zero, em vez de gravar Infinity ou NaN', async () => {
    await metricRepo.upsert(
      metric('ad-1', '2026-09-01', {
        impressions: 0,
        clicks: 0,
        spent: 0,
        conversions: 0,
      }),
    )

    await sut.execute({ campaignId: 'campaign-1' })

    const [row] = await performanceRepo.findByCreativeId('creative-A')
    expect(row.ctr).toBeNull()
    expect(row.cpc).toBeNull()
    expect(row.cpa).toBeNull()
    expect(row.roas).toBeNull()
  })

  it('usa a menor data como startDate e a maior como endDate', async () => {
    await metricRepo.upsert(metric('ad-1', '2026-09-03'))
    await metricRepo.upsert(metric('ad-1', '2026-09-01'))
    await metricRepo.upsert(metric('ad-2', '2026-09-05'))

    await sut.execute({ campaignId: 'campaign-1' })

    const [row] = await performanceRepo.findByCreativeId('creative-A')
    expect(row.startDate).toEqual(day('2026-09-01'))
    expect(row.endDate).toEqual(day('2026-09-05'))
  })

  it('ignora anúncios sem criativo vinculado', async () => {
    await adRepo.save(makeAd({ adSetId: 'adset-1', creativeId: null }, 'ad-4'))
    await metricRepo.upsert(metric('ad-4', '2026-09-01'))

    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isRight() && result.value.synced).toBe(0)
    expect(performanceRepo.items).toHaveLength(0)
  })

  it('não cria linha para criativo sem nenhuma métrica', async () => {
    const result = await sut.execute({ campaignId: 'campaign-1' })

    expect(result.isRight() && result.value.synced).toBe(0)
    expect(performanceRepo.items).toHaveLength(0)
  })

  it('é idempotente: rodar duas vezes atualiza a mesma linha em vez de duplicar', async () => {
    await metricRepo.upsert(metric('ad-1', '2026-09-01'))
    await sut.execute({ campaignId: 'campaign-1' })

    await metricRepo.upsert(metric('ad-1', '2026-09-02'))
    await sut.execute({ campaignId: 'campaign-1' })

    const rows = await performanceRepo.findByCreativeId('creative-A')
    expect(rows).toHaveLength(1)
    expect(rows[0].impressions).toBe(2000)
    expect(rows[0].endDate).toEqual(day('2026-09-02'))
  })

  it('marca as linhas geradas com source meta_sync', async () => {
    await metricRepo.upsert(metric('ad-1', '2026-09-01'))

    await sut.execute({ campaignId: 'campaign-1' })

    const [row] = await performanceRepo.findByCreativeId('creative-A')
    expect(row.source).toBe('meta_sync')
    expect(row.platform).toBe('meta')
    expect(row.campaignId).toBe('campaign-1')
  })

  it('não sobrescreve os registros digitados à mão', async () => {
    await performanceRepo.create({
      creativeId: 'creative-A',
      platform: 'instagram',
      campaignId: 'campaign-1',
      impressions: 7,
      clicks: 7,
      conversions: 7,
      spend: 7,
      startDate: day('2026-08-01'),
      source: 'manual',
    })
    await metricRepo.upsert(metric('ad-1', '2026-09-01'))

    await sut.execute({ campaignId: 'campaign-1' })

    const rows = await performanceRepo.findByCreativeId('creative-A')
    expect(rows).toHaveLength(2)
    const manual = rows.find((r) => r.source === 'manual')
    expect(manual?.impressions).toBe(7)
  })

  it('retorna left quando a campanha não existe', async () => {
    const result = await sut.execute({ campaignId: 'nao-existe' })

    expect(result.isLeft()).toBe(true)
  })
})
