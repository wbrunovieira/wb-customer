import { describe, it, expect, beforeEach } from 'vitest'
import { GetAttributionPanelUseCase } from './get-attribution-panel.use-case'
import { InMemorySocialAttributionReportRepository } from './_test/in-memory-social-attribution-report.repository'
import { InMemoryCustomerRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-customer.repository'
import { makeCustomer } from '@/domain/creatives/application/use-cases/_test/factories'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'

describe('GetAttributionPanelUseCase', () => {
  let report: InMemorySocialAttributionReportRepository
  let customers: InMemoryCustomerRepository
  let sut: GetAttributionPanelUseCase

  // Quinta-feira. A semana dela começa na segunda, 2026-09-07.
  const NOW = new Date('2026-09-10T12:00:00.000Z')

  const conversation = (over: Partial<{ at: string; source: string; postRef: string | null }> = {}) => ({
    activityId: `act-${Math.random().toString(36).slice(2, 8)}`,
    customerId: 'customer-1',
    occurredAt: new Date(over.at ?? '2026-09-10T09:00:00.000Z'),
    linkId: 'link-1',
    source: over.source ?? 'instagram',
    postRef: over.postRef === undefined ? 'carrossel-1' : over.postRef,
    code: 'K7MQ2A',
  })

  const run = async (weeks?: number) => {
    const result = await sut.execute({ customerId: 'customer-1', weeks, now: NOW })
    if (result.isLeft()) throw new Error('não deveria falhar')
    return result.value
  }

  beforeEach(async () => {
    report = new InMemorySocialAttributionReportRepository()
    customers = new InMemoryCustomerRepository()
    await customers.save(makeCustomer({ id: 'customer-1' }))
    sut = new GetAttributionPanelUseCase(customers, report)
  })

  it('recusa cliente inexistente', async () => {
    const result = await sut.execute({ customerId: 'nao-existe', now: NOW })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(CustomerNotFoundError)
  })

  it('conta o total de conversas atribuídas', async () => {
    report.items.push(conversation(), conversation(), conversation())

    expect((await run()).total).toBe(3)
  })

  it('agrupa por semana começando na segunda-feira', async () => {
    report.items.push(
      conversation({ at: '2026-09-10T09:00:00.000Z' }), // quinta
      conversation({ at: '2026-09-07T23:00:00.000Z' }), // segunda da mesma semana
    )

    const out = await run()
    const week = out.weeks.find((w) => w.weekStart === '2026-09-07')

    expect(week?.conversations).toBe(2)
  })

  it('inclui semanas sem conversa, com zero', async () => {
    // Uma curva que pula as semanas vazias mente sobre a cadência: some
    // justamente a semana em que nada entrou, que é a informação mais útil.
    report.items.push(conversation({ at: '2026-09-10T09:00:00.000Z' }))

    const out = await run(4)

    expect(out.weeks).toHaveLength(4)
    expect(out.weeks.filter((w) => w.conversations === 0)).toHaveLength(3)
  })

  it('devolve as semanas da mais antiga para a mais recente', async () => {
    const out = await run(4)
    const starts = out.weeks.map((w) => w.weekStart)

    expect([...starts].sort()).toEqual(starts)
  })

  it('agrupa por origem', async () => {
    report.items.push(
      conversation({ source: 'instagram' }),
      conversation({ source: 'instagram' }),
      conversation({ source: 'facebook' }),
    )

    const out = await run()

    expect(out.bySource.find((s) => s.source === 'instagram')?.conversations).toBe(2)
    expect(out.bySource.find((s) => s.source === 'facebook')?.conversations).toBe(1)
  })

  it('agrupa por post', async () => {
    report.items.push(
      conversation({ postRef: 'carrossel-1' }),
      conversation({ postRef: 'carrossel-1' }),
      conversation({ postRef: 'reels-2' }),
    )

    const out = await run()

    expect(out.byPost.find((p) => p.postRef === 'carrossel-1')?.conversations).toBe(2)
    expect(out.byPost.find((p) => p.postRef === 'reels-2')?.conversations).toBe(1)
  })

  it('rotula conversa sem referência de post em vez de descartá-la', async () => {
    report.items.push(conversation({ postRef: null }))

    const out = await run()

    expect(out.byPost).toHaveLength(1)
    expect(out.byPost[0].postRef).toBeNull()
    expect(out.byPost[0].conversations).toBe(1)
  })

  it('ordena origens e posts do maior para o menor', async () => {
    report.items.push(
      conversation({ postRef: 'a' }),
      conversation({ postRef: 'b' }),
      conversation({ postRef: 'b' }),
    )

    expect((await run()).byPost[0].postRef).toBe('b')
  })

  it('respeita a janela de semanas pedida', async () => {
    report.items.push(conversation({ at: '2026-08-01T09:00:00.000Z' })) // bem antes

    const out = await run(4)

    expect(out.total).toBe(0)
    expect(out.weeks).toHaveLength(4)
  })

  it('usa quatro semanas por padrão, que é a janela do plano editorial', async () => {
    expect((await run()).weeks).toHaveLength(4)
  })
})
