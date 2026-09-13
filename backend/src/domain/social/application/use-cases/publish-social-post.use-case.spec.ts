import { describe, it, expect, beforeEach } from 'vitest'
import { PublishSocialPostUseCase } from './publish-social-post.use-case'
import { ValidateSocialContentUseCase } from './validate-social-content.use-case'
import { InMemorySocialEngineGateway } from './_test/in-memory-social-engine.gateway'
import { InMemorySocialPublicationRepository } from './_test/in-memory-social-publication.repository'
import { InMemoryCustomerRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-customer.repository'
import { makeCustomer } from '@/domain/creatives/application/use-cases/_test/factories'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { CustomerNotLinkedToGroupError } from '../../domain/exceptions/customer-not-linked-to-group.error'
import { ContentRulesViolationError } from '../../domain/exceptions/content-rules-violation.error'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'
import { ChannelNotAvailableError } from '../../domain/exceptions/channel-not-available.error'
import { InvalidScheduleDateError } from '../../domain/exceptions/invalid-schedule-date.error'

describe('PublishSocialPostUseCase', () => {
  let engine: InMemorySocialEngineGateway
  let customers: InMemoryCustomerRepository
  let publications: InMemorySocialPublicationRepository
  let sut: PublishSocialPostUseCase

  const NOW = new Date('2026-09-13T12:00:00.000Z')
  const FUTURE = new Date('2026-09-14T09:00:00.000Z')
  const CONTENT = 'Peça sua encomenda pelo WhatsApp. [ref: K7MQ2A]'

  const channel = (id: string, over: Partial<{ groupId: string | null; disabled: boolean; provider: string }> = {}) => ({
    id,
    name: `canal ${id}`,
    provider: over.provider ?? 'instagram',
    disabled: over.disabled ?? false,
    groupId: over.groupId === undefined ? 'g1' : over.groupId,
  })

  const publish = (over: Partial<Parameters<PublishSocialPostUseCase['execute']>[0]> = {}) =>
    sut.execute({
      customerId: 'customer-1',
      content: CONTENT,
      channelIds: ['c1'],
      mode: 'schedule',
      scheduledFor: FUTURE,
      createdByUserId: 'user-1',
      now: NOW,
      ...over,
    })

  beforeEach(async () => {
    engine = new InMemorySocialEngineGateway()
    engine.groups = [{ id: 'g1', name: 'Padaria' }]
    engine.channels = [channel('c1'), channel('c2', { provider: 'facebook' })]

    customers = new InMemoryCustomerRepository()
    const customer = makeCustomer({ id: 'customer-1' })
    customer.linkPostizGroup('g1')
    await customers.save(customer)

    publications = new InMemorySocialPublicationRepository()
    sut = new PublishSocialPostUseCase(
      customers,
      engine,
      publications,
      new ValidateSocialContentUseCase(),
    )
  })

  it('recusa cliente inexistente', async () => {
    const result = await publish({ customerId: 'nao-existe' })

    expect(result.value).toBeInstanceOf(CustomerNotFoundError)
  })

  it('recusa cliente sem grupo ligado', async () => {
    const solto = makeCustomer({ id: 'customer-2' })
    await customers.save(solto)

    const result = await publish({ customerId: 'customer-2' })

    expect(result.value).toBeInstanceOf(CustomerNotLinkedToGroupError)
  })

  it('barra texto que fere as regras da casa', async () => {
    // Travessão e preço são bloqueio; o post não pode chegar ao motor.
    const result = await publish({ content: 'Pão quentinho — a partir de R$ 5' })

    expect(result.value).toBeInstanceOf(ContentRulesViolationError)
    expect(engine.published).toHaveLength(0)
  })

  it('devolve as violações, para a tela destacar o trecho', async () => {
    const result = await publish({ content: 'Pão quentinho — a partir de R$ 5' })

    const error = result.value as ContentRulesViolationError
    expect(error.violations.length).toBeGreaterThan(0)
    expect(error.violations[0]).toHaveProperty('index')
  })

  it('valida antes de chamar o motor, mesmo com o motor fora do ar', async () => {
    // A ordem importa: validar depois seria validar o que já saiu.
    engine.configured = false

    const result = await publish({ content: 'Pão — barato' })

    expect(result.value).toBeInstanceOf(ContentRulesViolationError)
  })

  it('recusa quando o motor não está configurado', async () => {
    engine.configured = false

    const result = await publish()

    expect(result.value).toBeInstanceOf(SocialEngineNotConfiguredError)
  })

  it('recusa canal de outro grupo', async () => {
    // O erro caro: publicaria na conta de outro cliente.
    engine.channels = [channel('c9', { groupId: 'outro-grupo' })]

    const result = await publish({ channelIds: ['c9'] })

    expect(result.value).toBeInstanceOf(ChannelNotAvailableError)
    expect(engine.published).toHaveLength(0)
  })

  it('recusa canal inexistente', async () => {
    const result = await publish({ channelIds: ['fantasma'] })

    expect(result.value).toBeInstanceOf(ChannelNotAvailableError)
  })

  it('recusa canal desativado, que engoliria o post calado', async () => {
    engine.channels = [channel('c1', { disabled: true })]

    const result = await publish()

    expect(result.value).toBeInstanceOf(ChannelNotAvailableError)
  })

  it('recusa lista de canais vazia', async () => {
    const result = await publish({ channelIds: [] })

    expect(result.value).toBeInstanceOf(ChannelNotAvailableError)
  })

  it('recusa agendamento sem data', async () => {
    const result = await publish({ scheduledFor: undefined })

    expect(result.value).toBeInstanceOf(InvalidScheduleDateError)
  })

  it('recusa agendamento para o passado', async () => {
    const result = await publish({ scheduledFor: new Date('2026-09-12T09:00:00.000Z') })

    expect(result.value).toBeInstanceOf(InvalidScheduleDateError)
  })

  it('agenda para a data pedida', async () => {
    const result = await publish()

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(result.value.scheduledFor).toEqual(FUTURE)
    expect(engine.published[0].mode).toBe('schedule')
  })

  it('publica já com mode now, usando o relógio', async () => {
    const result = await publish({ mode: 'now', scheduledFor: undefined })

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(result.value.scheduledFor).toEqual(NOW)
  })

  it('entrega vários canais numa chamada só', async () => {
    // É assim que o espelho entre redes sai junto.
    const result = await publish({ channelIds: ['c1', 'c2'] })

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(engine.published).toHaveLength(1)
    expect(engine.published[0].channelIds).toEqual(['c1', 'c2'])
    expect(result.value.targets).toHaveLength(2)
  })

  it('guarda o id de post de cada canal, que é a volta para as métricas', async () => {
    const result = await publish({ channelIds: ['c1', 'c2'] })

    if (result.isLeft()) throw new Error('não deveria falhar')
    const saved = await publications.findByPostizPostId('post-c2')
    expect(saved?.id).toBe(result.value.publicationId)
    expect(saved?.targets.map((t) => t.postizPostId).sort()).toEqual(['post-c1', 'post-c2'])
  })

  it('guarda a rede de cada destino', async () => {
    const result = await publish({ channelIds: ['c1', 'c2'] })

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(result.value.targets.map((t) => t.provider).sort()).toEqual([
      'facebook',
      'instagram',
    ])
  })

  it('guarda o grupo usado, para a auditoria não mudar quando o vínculo mudar', async () => {
    await publish()

    const [saved] = await publications.findByCustomerId('customer-1')
    expect(saved.postizGroupId).toBe('g1')
  })

  it('guarda o vínculo com o link de atribuição e o criativo', async () => {
    await publish({ attributionLinkId: 'link-1', creativeId: 'creative-1' })

    const [saved] = await publications.findByCustomerId('customer-1')
    expect(saved.attributionLinkId).toBe('link-1')
    expect(saved.creativeId).toBe('creative-1')
  })

  it('não grava publicação quando o motor recusa a entrega', async () => {
    // Gravar aqui criaria um post que existe no wb-customer e não na rede.
    engine.failOnPublish = new Error('Postiz respondeu 400')

    await expect(publish()).rejects.toThrow('Postiz respondeu 400')
    expect(publications.items).toHaveLength(0)
  })
})
