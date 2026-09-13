import { describe, it, expect, beforeEach } from 'vitest'
import { GetSocialQueueUseCase } from './get-social-queue.use-case'
import { InMemorySocialEngineGateway } from './_test/in-memory-social-engine.gateway'
import { InMemoryCustomerRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-customer.repository'
import { makeCustomer } from '@/domain/creatives/application/use-cases/_test/factories'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { CustomerNotLinkedToGroupError } from '../../domain/exceptions/customer-not-linked-to-group.error'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'
import { InvalidScheduleDateError } from '../../domain/exceptions/invalid-schedule-date.error'

describe('GetSocialQueueUseCase', () => {
  let engine: InMemorySocialEngineGateway
  let customers: InMemoryCustomerRepository
  let sut: GetSocialQueueUseCase

  const NOW = new Date('2026-09-13T12:00:00.000Z')

  const post = (id: string, at: string) => ({
    id,
    content: `post ${id}`,
    publishAt: new Date(at),
    state: 'QUEUE',
    url: null,
    channelId: 'c1',
    channelName: 'canal',
    provider: 'instagram',
    group: null,
  })

  const run = async (over: Partial<{ from: Date; to: Date }> = {}) => {
    const result = await sut.execute({ customerId: 'customer-1', now: NOW, ...over })
    if (result.isLeft()) throw new Error('não deveria falhar')
    return result.value
  }

  beforeEach(async () => {
    engine = new InMemorySocialEngineGateway()
    customers = new InMemoryCustomerRepository()
    const customer = makeCustomer({ id: 'customer-1' })
    customer.linkPostizGroup('g1')
    await customers.save(customer)
    sut = new GetSocialQueueUseCase(customers, engine)
  })

  it('recusa cliente inexistente', async () => {
    const result = await sut.execute({ customerId: 'nao-existe', now: NOW })

    expect(result.value).toBeInstanceOf(CustomerNotFoundError)
  })

  it('recusa cliente sem grupo ligado', async () => {
    await customers.save(makeCustomer({ id: 'customer-2' }))

    const result = await sut.execute({ customerId: 'customer-2', now: NOW })

    expect(result.value).toBeInstanceOf(CustomerNotLinkedToGroupError)
  })

  it('recusa quando o motor não está configurado', async () => {
    engine.configured = false

    const result = await sut.execute({ customerId: 'customer-1', now: NOW })

    expect(result.value).toBeInstanceOf(SocialEngineNotConfiguredError)
  })

  it('recusa janela com início depois do fim', async () => {
    const result = await sut.execute({
      customerId: 'customer-1',
      from: new Date('2026-10-01T00:00:00.000Z'),
      to: new Date('2026-09-01T00:00:00.000Z'),
      now: NOW,
    })

    expect(result.value).toBeInstanceOf(InvalidScheduleDateError)
  })

  it('pergunta ao motor pelo grupo do cliente, não pela organização inteira', async () => {
    // Sem o grupo, a agenda mostraria post de outro cliente.
    await run()

    expect(engine.queueQueries[0].groupId).toBe('g1')
  })

  it('olha os trinta dias à frente por padrão', async () => {
    await run()

    const { from, to } = engine.queueQueries[0]
    const days = Math.round((to.getTime() - from.getTime()) / 86400000)
    expect(days).toBe(30)
  })

  it('respeita a janela pedida', async () => {
    const from = new Date('2026-09-20T00:00:00.000Z')
    const to = new Date('2026-09-21T00:00:00.000Z')

    const out = await run({ from, to })

    expect(out.from).toEqual(from)
    expect(out.to).toEqual(to)
  })

  it('devolve os posts em ordem cronológica', async () => {
    // A agenda é lida de cima para baixo como o tempo passa.
    engine.queue = [
      post('c', '2026-09-20T10:00:00.000Z'),
      post('a', '2026-09-14T10:00:00.000Z'),
      post('b', '2026-09-17T10:00:00.000Z'),
    ]

    expect((await run()).posts.map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('devolve fila vazia sem erro', async () => {
    expect((await run()).posts).toEqual([])
  })
})
