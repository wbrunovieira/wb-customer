import { describe, it, expect, beforeEach } from 'vitest'
import { ListSocialPostMetricsUseCase } from './list-social-post-metrics.use-case'
import { InMemorySocialPostMetricRepository } from './_test/in-memory-social-post-metric.repository'
import { InMemoryCustomerRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-customer.repository'
import { makeCustomer } from '@/domain/creatives/application/use-cases/_test/factories'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'

describe('ListSocialPostMetricsUseCase', () => {
  let customers: InMemoryCustomerRepository
  let metrics: InMemorySocialPostMetricRepository
  let sut: ListSocialPostMetricsUseCase

  const metric = (postId: string, customerId: string) => ({
    postizPostId: postId,
    customerId,
    provider: 'instagram',
    reach: 100,
    saves: null,
    raw: [],
    collectedAt: new Date('2026-09-14T07:00:00.000Z'),
  })

  beforeEach(async () => {
    customers = new InMemoryCustomerRepository()
    await customers.save(makeCustomer({ id: 'customer-1' }))
    metrics = new InMemorySocialPostMetricRepository()
    sut = new ListSocialPostMetricsUseCase(customers, metrics)
  })

  it('recusa cliente inexistente', async () => {
    const result = await sut.execute({ customerId: 'nao-existe' })

    expect(result.value).toBeInstanceOf(CustomerNotFoundError)
  })

  it('devolve só as métricas do cliente pedido', async () => {
    await metrics.upsert(metric('post-1', 'customer-1'))
    await metrics.upsert(metric('post-2', 'outro-cliente'))

    const result = await sut.execute({ customerId: 'customer-1' })

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(result.value.metrics.map((m) => m.postizPostId)).toEqual(['post-1'])
  })

  it('preserva o nulo do que a rede não informou', async () => {
    // Zero medido e dado ausente são fatos diferentes; a leitura não pode
    // achatar um no outro.
    await metrics.upsert(metric('post-1', 'customer-1'))

    const result = await sut.execute({ customerId: 'customer-1' })

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(result.value.metrics[0].saves).toBeNull()
  })

  it('devolve lista vazia quando ainda não há coleta', async () => {
    const result = await sut.execute({ customerId: 'customer-1' })

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(result.value.metrics).toEqual([])
  })
})
