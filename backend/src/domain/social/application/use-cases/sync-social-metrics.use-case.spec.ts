import { describe, it, expect, beforeEach } from 'vitest'
import { SyncSocialMetricsUseCase } from './sync-social-metrics.use-case'
import { InMemorySocialEngineGateway } from './_test/in-memory-social-engine.gateway'
import { InMemorySocialPublicationRepository } from './_test/in-memory-social-publication.repository'
import { InMemorySocialPostMetricRepository } from './_test/in-memory-social-post-metric.repository'

describe('SyncSocialMetricsUseCase', () => {
  let engine: InMemorySocialEngineGateway
  let publications: InMemorySocialPublicationRepository
  let metrics: InMemorySocialPostMetricRepository
  let sut: SyncSocialMetricsUseCase

  const NOW = new Date('2026-09-14T12:00:00.000Z')
  const ONTEM = new Date('2026-09-13T10:00:00.000Z')
  const MES_PASSADO = new Date('2026-08-01T10:00:00.000Z')

  const givenPublished = async (
    over: Partial<{ postId: string; when: Date; provider: string; customerId: string }> = {},
  ) => {
    await publications.create({
      customerId: over.customerId ?? 'customer-1',
      postizGroupId: 'g1',
      content: 'texto',
      mode: 'schedule',
      scheduledFor: over.when ?? ONTEM,
      createdByUserId: 'user-1',
      targets: [
        {
          channelId: 'c1',
          provider: over.provider ?? 'instagram',
          postizPostId: over.postId ?? 'post-1',
          state: 'PUBLISHED',
        },
      ],
    })
  }

  const run = async (over = {}) => {
    const result = await sut.execute({ now: NOW, ...over })
    if (result.isLeft()) throw new Error('não deveria falhar')
    return result.value
  }

  beforeEach(() => {
    engine = new InMemorySocialEngineGateway()
    publications = new InMemorySocialPublicationRepository()
    metrics = new InMemorySocialPostMetricRepository()
    sut = new SyncSocialMetricsUseCase(publications, metrics, engine)
  })

  it('não faz nada com o motor desconfigurado', async () => {
    engine.configured = false
    await givenPublished()

    expect((await run()).asked).toBe(0)
    expect(engine.metricsQueries).toEqual([])
  })

  it('guarda os números que a rede informou', async () => {
    await givenPublished()
    engine.metrics = {
      'post-1': {
        available: true,
        metrics: [
          { label: 'Reach', total: 1200, percentageChange: 10 },
          { label: 'Likes', total: 87, percentageChange: 3 },
          { label: 'Saved', total: 14, percentageChange: 0 },
        ],
      },
    }

    const out = await run()

    expect(out.collected).toBe(1)
    const saved = await metrics.findByPostizPostId('post-1')
    expect(saved).toMatchObject({ reach: 1200, likes: 87, saves: 14 })
  })

  it('deixa nulo o que a rede não informou, em vez de zero', async () => {
    // Zero medido e dado ausente são fatos diferentes.
    await givenPublished()
    engine.metrics = {
      'post-1': { available: true, metrics: [{ label: 'Reach', total: 500, percentageChange: 0 }] },
    }

    await run()

    const saved = await metrics.findByPostizPostId('post-1')
    expect(saved?.reach).toBe(500)
    expect(saved?.likes).toBeNull()
    expect(saved?.saves).toBeNull()
  })

  it('não grava linha quando a rede não tem o que informar', async () => {
    // Uma linha de nulos faria "não medido" parecer "medido e deu zero".
    await givenPublished()

    const out = await run()

    expect(out.unavailable).toBe(1)
    expect(out.collected).toBe(0)
    expect(metrics.items).toHaveLength(0)
  })

  it('guarda o retorno inteiro, para não perder rótulo ainda sem coluna', async () => {
    await givenPublished()
    engine.metrics = {
      'post-1': {
        available: true,
        metrics: [{ label: 'Métrica Nova Da Rede', total: 42, percentageChange: 0 }],
      },
    }

    await run()

    const saved = await metrics.findByPostizPostId('post-1')
    expect(saved?.raw).toEqual([
      { label: 'Métrica Nova Da Rede', total: 42, percentageChange: 0 },
    ])
  })

  it('recoleta os últimos dias, não só o dia anterior', async () => {
    // Algumas métricas demoram a estabilizar; congelar ontem guardaria um
    // número que ainda ia mudar.
    await givenPublished({ postId: 'post-1', when: ONTEM })
    await givenPublished({ postId: 'post-2', when: new Date('2026-09-10T10:00:00.000Z') })
    engine.metrics = {
      'post-1': { available: true, metrics: [{ label: 'Reach', total: 1, percentageChange: 0 }] },
      'post-2': { available: true, metrics: [{ label: 'Reach', total: 2, percentageChange: 0 }] },
    }

    expect((await run()).collected).toBe(2)
  })

  it('ignora post fora da janela', async () => {
    await givenPublished({ postId: 'antigo', when: MES_PASSADO })

    expect((await run()).asked).toBe(0)
  })

  it('atualiza em vez de duplicar quando coleta de novo', async () => {
    // O número corrente é o que importa, não o histórico de leituras.
    await givenPublished()
    engine.metrics = {
      'post-1': { available: true, metrics: [{ label: 'Reach', total: 100, percentageChange: 0 }] },
    }
    await run()

    engine.metrics = {
      'post-1': { available: true, metrics: [{ label: 'Reach', total: 250, percentageChange: 0 }] },
    }
    await run()

    expect(metrics.items).toHaveLength(1)
    expect((await metrics.findByPostizPostId('post-1'))?.reach).toBe(250)
  })

  it('não coleta de post que ainda não saiu', async () => {
    await publications.create({
      customerId: 'customer-1',
      postizGroupId: 'g1',
      content: 'texto',
      mode: 'schedule',
      scheduledFor: ONTEM,
      createdByUserId: 'user-1',
      targets: [{ channelId: 'c1', provider: 'instagram', postizPostId: 'na-fila' }],
    })

    expect((await run()).asked).toBe(0)
  })

  it('respeita o teto de posts por passada', async () => {
    for (let i = 0; i < 5; i++) await givenPublished({ postId: `post-${i}` })

    expect((await run({ limit: 2 })).asked).toBe(2)
  })
})
