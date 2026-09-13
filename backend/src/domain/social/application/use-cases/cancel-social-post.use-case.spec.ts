import { describe, it, expect, beforeEach } from 'vitest'
import { CancelSocialPostUseCase } from './cancel-social-post.use-case'
import { InMemorySocialEngineGateway } from './_test/in-memory-social-engine.gateway'
import { InMemoryCustomerRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-customer.repository'
import { makeCustomer } from '@/domain/creatives/application/use-cases/_test/factories'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { CustomerNotLinkedToGroupError } from '../../domain/exceptions/customer-not-linked-to-group.error'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'
import { PostNotInCustomerQueueError } from '../../domain/exceptions/post-not-in-customer-queue.error'

describe('CancelSocialPostUseCase', () => {
  let engine: InMemorySocialEngineGateway
  let customers: InMemoryCustomerRepository
  let sut: CancelSocialPostUseCase

  const NOW = new Date('2026-09-13T12:00:00.000Z')

  const post = (id: string) => ({
    id,
    content: `post ${id}`,
    publishAt: new Date('2026-09-20T10:00:00.000Z'),
    state: 'QUEUE',
    url: null,
    channelId: 'c1',
    channelName: 'canal',
    provider: 'instagram',
    group: null,
  })

  beforeEach(async () => {
    engine = new InMemorySocialEngineGateway()
    engine.queue = [post('p1')]
    customers = new InMemoryCustomerRepository()
    const customer = makeCustomer({ id: 'customer-1' })
    customer.linkPostizGroup('g1')
    await customers.save(customer)
    sut = new CancelSocialPostUseCase(customers, engine)
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

  it('recusa post que não está na fila deste cliente', async () => {
    // O motor aceitaria o id sozinho e apagaria post de outro cliente.
    const result = await sut.execute({
      customerId: 'customer-1',
      postId: 'de-outro-cliente',
      now: NOW,
    })

    expect(result.value).toBeInstanceOf(PostNotInCustomerQueueError)
  })

  it('não chama o motor quando o post não é do cliente', async () => {
    await sut.execute({ customerId: 'customer-1', postId: 'de-outro', now: NOW })

    expect(engine.canceled).toEqual([])
  })

  it('confere a posse consultando a fila do grupo do cliente', async () => {
    await sut.execute({ customerId: 'customer-1', postId: 'p1', now: NOW })

    expect(engine.queueQueries[0].groupId).toBe('g1')
  })

  it('cancela o post que está na fila', async () => {
    const result = await sut.execute({ customerId: 'customer-1', postId: 'p1', now: NOW })

    expect(result.isRight()).toBe(true)
    expect(engine.canceled).toEqual(['p1'])
  })

  it('olha uma janela larga ao conferir posse, porque a data do post é desconhecida', async () => {
    await sut.execute({ customerId: 'customer-1', postId: 'p1', now: NOW })

    const { from, to } = engine.queueQueries[0]
    expect(from.getTime()).toBeLessThan(NOW.getTime())
    expect(to.getTime()).toBeGreaterThan(NOW.getTime())
  })
})
