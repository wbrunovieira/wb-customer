import { describe, it, expect, beforeEach } from 'vitest'
import { ListSocialGroupsUseCase } from './list-social-groups.use-case'
import { InMemorySocialEngineGateway } from './_test/in-memory-social-engine.gateway'
import { InMemoryCustomerRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-customer.repository'
import { makeCustomer } from '@/domain/creatives/application/use-cases/_test/factories'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'

describe('ListSocialGroupsUseCase', () => {
  let engine: InMemorySocialEngineGateway
  let customers: InMemoryCustomerRepository
  let sut: ListSocialGroupsUseCase

  const channel = (id: string, groupId: string | null) => ({
    id,
    name: `canal ${id}`,
    provider: 'instagram',
    disabled: false,
    groupId,
  })

  const run = async () => {
    const result = await sut.execute()
    if (result.isLeft()) throw new Error('não deveria falhar')
    return result.value
  }

  beforeEach(() => {
    engine = new InMemorySocialEngineGateway()
    customers = new InMemoryCustomerRepository()
    sut = new ListSocialGroupsUseCase(engine, customers)
  })

  it('recusa quando o motor não está configurado', async () => {
    engine.configured = false

    const result = await sut.execute()

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(SocialEngineNotConfiguredError)
  })

  it('conta quantos canais cada grupo tem', async () => {
    engine.groups = [{ id: 'g1', name: 'Padaria' }]
    engine.channels = [channel('c1', 'g1'), channel('c2', 'g1'), channel('c3', 'outro')]

    expect((await run()).groups[0].channels).toBe(2)
  })

  it('não conta canal sem grupo', async () => {
    engine.groups = [{ id: 'g1', name: 'Padaria' }]
    engine.channels = [channel('c1', null)]

    expect((await run()).groups[0].channels).toBe(0)
  })

  it('mostra qual cliente já ocupa o grupo', async () => {
    // Sem isso o operador liga o mesmo grupo a dois clientes e só descobre
    // quando o post do cliente errado sai publicado.
    const customer = makeCustomer({ id: 'customer-1', name: 'Padaria do Zé' })
    customer.linkPostizGroup('g1')
    await customers.save(customer)

    engine.groups = [{ id: 'g1', name: 'Padaria' }]

    const [group] = (await run()).groups
    expect(group.linkedCustomerId).toBe('customer-1')
    expect(group.linkedCustomerName).toBe('Padaria do Zé')
  })

  it('deixa em branco o grupo que ainda está livre', async () => {
    engine.groups = [{ id: 'g1', name: 'Padaria' }]

    const [group] = (await run()).groups
    expect(group.linkedCustomerId).toBeNull()
    expect(group.linkedCustomerName).toBeNull()
  })
})
