import { describe, it, expect, beforeEach } from 'vitest'
import { GetCustomerSocialChannelsUseCase } from './get-customer-social-channels.use-case'
import { InMemorySocialEngineGateway } from './_test/in-memory-social-engine.gateway'
import { InMemoryCustomerRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-customer.repository'
import { makeCustomer } from '@/domain/creatives/application/use-cases/_test/factories'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'

describe('GetCustomerSocialChannelsUseCase', () => {
  let engine: InMemorySocialEngineGateway
  let customers: InMemoryCustomerRepository
  let sut: GetCustomerSocialChannelsUseCase

  const channel = (id: string, groupId: string | null) => ({
    id,
    name: `canal ${id}`,
    provider: 'instagram',
    disabled: false,
    groupId,
  })

  const linked = async (groupId: string) => {
    const customer = makeCustomer({ id: 'customer-1' })
    customer.linkPostizGroup(groupId)
    await customers.save(customer)
  }

  const run = async () => {
    const result = await sut.execute({ customerId: 'customer-1' })
    if (result.isLeft()) throw new Error('não deveria falhar')
    return result.value
  }

  beforeEach(() => {
    engine = new InMemorySocialEngineGateway()
    customers = new InMemoryCustomerRepository()
    sut = new GetCustomerSocialChannelsUseCase(customers, engine)
  })

  it('recusa cliente inexistente', async () => {
    const result = await sut.execute({ customerId: 'nao-existe' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(CustomerNotFoundError)
  })

  it('responde vazio quando o cliente ainda não foi ligado a um grupo', async () => {
    await customers.save(makeCustomer({ id: 'customer-1' }))

    const out = await run()

    expect(out.linked).toBe(false)
    expect(out.channels).toEqual([])
  })

  it('não precisa do motor para dizer que falta ligar', async () => {
    // Cliente sem vínculo é estado normal; a tela mostra o convite para ligar
    // mesmo com o motor desconfigurado.
    await customers.save(makeCustomer({ id: 'customer-1' }))
    engine.configured = false

    expect((await run()).linked).toBe(false)
  })

  it('devolve só os canais do grupo do cliente', async () => {
    await linked('g1')
    engine.groups = [{ id: 'g1', name: 'Padaria' }]
    engine.channels = [channel('c1', 'g1'), channel('c2', 'g2'), channel('c3', null)]

    const out = await run()

    expect(out.channels.map((c) => c.id)).toEqual(['c1'])
    expect(out.groupName).toBe('Padaria')
  })

  it('segue ligado, sem nome, quando o grupo sumiu do motor', async () => {
    await linked('g1')
    engine.groups = []

    const out = await run()

    expect(out.linked).toBe(true)
    expect(out.groupName).toBeNull()
    expect(out.channels).toEqual([])
  })
})
