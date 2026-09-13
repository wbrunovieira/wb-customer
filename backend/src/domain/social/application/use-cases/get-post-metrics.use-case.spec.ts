import { describe, it, expect, beforeEach } from 'vitest'
import { GetPostMetricsUseCase } from './get-post-metrics.use-case'
import { InMemorySocialEngineGateway } from './_test/in-memory-social-engine.gateway'
import { InMemoryCustomerRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-customer.repository'
import { makeCustomer } from '@/domain/creatives/application/use-cases/_test/factories'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { CustomerNotLinkedToGroupError } from '../../domain/exceptions/customer-not-linked-to-group.error'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'
import { PostNotInCustomerQueueError } from '../../domain/exceptions/post-not-in-customer-queue.error'

describe('GetPostMetricsUseCase', () => {
  let engine: InMemorySocialEngineGateway
  let customers: InMemoryCustomerRepository
  let sut: GetPostMetricsUseCase

  const NOW = new Date('2026-09-13T12:00:00.000Z')

  beforeEach(async () => {
    engine = new InMemorySocialEngineGateway()
    engine.queue = [
      {
        id: 'p1',
        content: 'post',
        publishAt: new Date('2026-09-10T10:00:00.000Z'),
        state: 'PUBLISHED',
        url: null,
        channelId: 'c1',
        channelName: 'canal',
        provider: 'instagram',
        group: null,
      },
    ]
    customers = new InMemoryCustomerRepository()
    const customer = makeCustomer({ id: 'customer-1' })
    customer.linkPostizGroup('g1')
    await customers.save(customer)
    sut = new GetPostMetricsUseCase(customers, engine)
  })

  it('recusa cliente inexistente', async () => {
    const result = await sut.execute({ customerId: 'nao-existe', postId: 'p1', now: NOW })

    expect(result.value).toBeInstanceOf(CustomerNotFoundError)
  })

  it('recusa cliente sem grupo ligado', async () => {
    await customers.save(makeCustomer({ id: 'customer-2' }))

    const result = await sut.execute({ customerId: 'customer-2', postId: 'p1', now: NOW })

    expect(result.value).toBeInstanceOf(CustomerNotLinkedToGroupError)
  })

  it('recusa quando o motor não está configurado', async () => {
    engine.configured = false

    const result = await sut.execute({ customerId: 'customer-1', postId: 'p1', now: NOW })

    expect(result.value).toBeInstanceOf(SocialEngineNotConfiguredError)
  })

  it('recusa ler métrica de post de outro cliente', async () => {
    // O id sozinho serviria para espiar o resultado de outro cliente.
    const result = await sut.execute({
      customerId: 'customer-1',
      postId: 'de-outro',
      now: NOW,
    })

    expect(result.value).toBeInstanceOf(PostNotInCustomerQueueError)
    expect(engine.metricsQueries).toEqual([])
  })

  it('devolve as métricas do post', async () => {
    engine.metrics = {
      p1: {
        available: true,
        metrics: [{ label: 'Reach', total: 1200, percentageChange: 12 }],
      },
    }

    const result = await sut.execute({ customerId: 'customer-1', postId: 'p1', now: NOW })

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(result.value.metrics[0]).toEqual({
      label: 'Reach',
      total: 1200,
      percentageChange: 12,
    })
  })

  it('marca como indisponível quando a rede não tem o que informar', async () => {
    // Ausência de dado não é zero: zero é resultado, ausência é falta de dado.
    const result = await sut.execute({ customerId: 'customer-1', postId: 'p1', now: NOW })

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(result.value.available).toBe(false)
    expect(result.value.metrics).toEqual([])
  })

  it('usa trinta dias por padrão', async () => {
    await sut.execute({ customerId: 'customer-1', postId: 'p1', now: NOW })

    expect(engine.metricsQueries[0].days).toBe(30)
  })

  it('respeita a janela pedida', async () => {
    await sut.execute({ customerId: 'customer-1', postId: 'p1', days: 7, now: NOW })

    expect(engine.metricsQueries[0].days).toBe(7)
  })
})
