import { describe, it, expect, beforeEach } from 'vitest'
import { ListSocialPublicationsUseCase } from './list-social-publications.use-case'
import { InMemorySocialPublicationRepository } from './_test/in-memory-social-publication.repository'
import { InMemoryCustomerRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-customer.repository'
import { makeCustomer } from '@/domain/creatives/application/use-cases/_test/factories'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'

describe('ListSocialPublicationsUseCase', () => {
  let customers: InMemoryCustomerRepository
  let publications: InMemorySocialPublicationRepository
  let sut: ListSocialPublicationsUseCase

  const record = (customerId: string) => ({
    customerId,
    postizGroupId: 'g1',
    content: 'texto',
    mode: 'schedule' as const,
    scheduledFor: new Date('2026-09-14T09:00:00.000Z'),
    createdByUserId: 'user-1',
    targets: [{ channelId: 'c1', provider: 'instagram', postizPostId: 'post-c1' }],
  })

  beforeEach(async () => {
    customers = new InMemoryCustomerRepository()
    await customers.save(makeCustomer({ id: 'customer-1' }))
    publications = new InMemorySocialPublicationRepository()
    sut = new ListSocialPublicationsUseCase(customers, publications)
  })

  it('recusa cliente inexistente', async () => {
    const result = await sut.execute({ customerId: 'nao-existe' })

    expect(result.value).toBeInstanceOf(CustomerNotFoundError)
  })

  it('devolve só as publicações do cliente pedido', async () => {
    await publications.create(record('customer-1'))
    await publications.create(record('outro'))

    const result = await sut.execute({ customerId: 'customer-1' })

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(result.value.publications).toHaveLength(1)
    expect(result.value.publications[0].targets[0].postizPostId).toBe('post-c1')
  })

  it('devolve lista vazia quando o cliente ainda não publicou', async () => {
    const result = await sut.execute({ customerId: 'customer-1' })

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(result.value.publications).toEqual([])
  })
})
