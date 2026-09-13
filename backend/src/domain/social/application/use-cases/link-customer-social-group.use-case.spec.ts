import { describe, it, expect, beforeEach } from 'vitest'
import { LinkCustomerSocialGroupUseCase } from './link-customer-social-group.use-case'
import { InMemorySocialEngineGateway } from './_test/in-memory-social-engine.gateway'
import { InMemoryCustomerRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-customer.repository'
import { makeCustomer } from '@/domain/creatives/application/use-cases/_test/factories'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'
import { SocialGroupNotFoundError } from '../../domain/exceptions/social-group-not-found.error'
import { SocialGroupAlreadyLinkedError } from '../../domain/exceptions/social-group-already-linked.error'

describe('LinkCustomerSocialGroupUseCase', () => {
  let engine: InMemorySocialEngineGateway
  let customers: InMemoryCustomerRepository
  let sut: LinkCustomerSocialGroupUseCase

  beforeEach(async () => {
    engine = new InMemorySocialEngineGateway()
    engine.groups = [{ id: 'g1', name: 'Padaria' }]
    customers = new InMemoryCustomerRepository()
    await customers.save(makeCustomer({ id: 'customer-1', name: 'Padaria do Zé' }))
    sut = new LinkCustomerSocialGroupUseCase(customers, engine)
  })

  it('recusa cliente inexistente', async () => {
    const result = await sut.execute({ customerId: 'nao-existe', groupId: 'g1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(CustomerNotFoundError)
  })

  it('recusa grupo que não existe no motor', async () => {
    const result = await sut.execute({ customerId: 'customer-1', groupId: 'fantasma' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(SocialGroupNotFoundError)
  })

  it('guarda o grupo no cliente', async () => {
    const result = await sut.execute({ customerId: 'customer-1', groupId: 'g1' })

    expect(result.isRight()).toBe(true)
    const saved = await customers.findById('customer-1')
    expect(saved?.postizGroupId).toBe('g1')
  })

  it('devolve o nome do grupo, para a tela confirmar o que foi ligado', async () => {
    const result = await sut.execute({ customerId: 'customer-1', groupId: 'g1' })

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(result.value.groupName).toBe('Padaria')
  })

  it('recusa grupo que já pertence a outro cliente', async () => {
    // Dois clientes no mesmo grupo publicariam na mesma conta social.
    const outro = makeCustomer({ id: 'customer-2', name: 'Bar do João' })
    outro.linkPostizGroup('g1')
    await customers.save(outro)

    const result = await sut.execute({ customerId: 'customer-1', groupId: 'g1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(SocialGroupAlreadyLinkedError)
  })

  it('aceita religar o mesmo grupo no mesmo cliente', async () => {
    await sut.execute({ customerId: 'customer-1', groupId: 'g1' })

    const result = await sut.execute({ customerId: 'customer-1', groupId: 'g1' })

    expect(result.isRight()).toBe(true)
  })

  it('desfaz o vínculo com groupId null', async () => {
    await sut.execute({ customerId: 'customer-1', groupId: 'g1' })

    const result = await sut.execute({ customerId: 'customer-1', groupId: null })

    expect(result.isRight()).toBe(true)
    expect((await customers.findById('customer-1'))?.postizGroupId).toBeNull()
  })

  it('desfaz o vínculo mesmo com o motor fora do ar', async () => {
    // Um vínculo errado não pode ficar preso justamente durante um incidente.
    await sut.execute({ customerId: 'customer-1', groupId: 'g1' })
    engine.configured = false

    const result = await sut.execute({ customerId: 'customer-1', groupId: null })

    expect(result.isRight()).toBe(true)
  })

  it('recusa ligar quando o motor não está configurado', async () => {
    engine.configured = false

    const result = await sut.execute({ customerId: 'customer-1', groupId: 'g1' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(SocialEngineNotConfiguredError)
  })
})
