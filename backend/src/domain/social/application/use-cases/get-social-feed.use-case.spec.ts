import { describe, it, expect, beforeEach } from 'vitest'
import { GetSocialFeedUseCase } from './get-social-feed.use-case'
import { InMemorySocialEngineGateway } from './_test/in-memory-social-engine.gateway'
import { InMemoryCustomerRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-customer.repository'
import { makeCustomer } from '@/domain/creatives/application/use-cases/_test/factories'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { CustomerNotLinkedToGroupError } from '../../domain/exceptions/customer-not-linked-to-group.error'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'
import { InvalidScheduleDateError } from '../../domain/exceptions/invalid-schedule-date.error'

describe('GetSocialFeedUseCase', () => {
  let engine: InMemorySocialEngineGateway
  let customers: InMemoryCustomerRepository
  let sut: GetSocialFeedUseCase

  const NOW = new Date('2026-09-13T12:00:00.000Z')

  const post = (id: string, at: string, state = 'PUBLISHED') => ({
    id,
    content: `post ${id}`,
    publishAt: new Date(at),
    state,
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
    sut = new GetSocialFeedUseCase(customers, engine)
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
      from: NOW,
      to: new Date('2026-09-01T00:00:00.000Z'),
      now: NOW,
    })

    expect(result.value).toBeInstanceOf(InvalidScheduleDateError)
  })

  it('olha os trinta dias para trás por padrão', async () => {
    await run()

    const { from, to } = engine.queueQueries[0]
    expect(to).toEqual(NOW)
    expect(Math.round((to.getTime() - from.getTime()) / 86400000)).toBe(30)
  })

  it('pergunta pelo grupo do cliente', async () => {
    await run()

    expect(engine.queueQueries[0].groupId).toBe('g1')
  })

  it('deixa de fora o que ainda não saiu', async () => {
    // Post na fila pertence à agenda; aqui a pergunta é "o que saiu".
    engine.queue = [
      post('publicado', '2026-09-10T10:00:00.000Z', 'PUBLISHED'),
      post('na-fila', '2026-09-12T10:00:00.000Z', 'QUEUE'),
      post('rascunho', '2026-09-11T10:00:00.000Z', 'DRAFT'),
    ]

    expect((await run()).posts.map((p) => p.id)).toEqual(['publicado'])
  })

  it('inclui post que falhou, que é a notícia mais importante do feed', async () => {
    // Esconder falha faria o silêncio parecer sucesso.
    engine.queue = [post('falhou', '2026-09-10T10:00:00.000Z', 'ERROR')]

    expect((await run()).posts.map((p) => p.id)).toEqual(['falhou'])
  })

  it('devolve do mais recente para o mais antigo', async () => {
    engine.queue = [
      post('velho', '2026-09-01T10:00:00.000Z'),
      post('novo', '2026-09-12T10:00:00.000Z'),
      post('meio', '2026-09-06T10:00:00.000Z'),
    ]

    expect((await run()).posts.map((p) => p.id)).toEqual(['novo', 'meio', 'velho'])
  })

  it('devolve feed vazio sem erro', async () => {
    expect((await run()).posts).toEqual([])
  })
})
