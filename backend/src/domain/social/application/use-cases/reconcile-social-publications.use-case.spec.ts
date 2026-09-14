import { describe, it, expect, beforeEach } from 'vitest'
import { ReconcileSocialPublicationsUseCase } from './reconcile-social-publications.use-case'
import { InMemorySocialEngineGateway } from './_test/in-memory-social-engine.gateway'
import { InMemorySocialPublicationRepository } from './_test/in-memory-social-publication.repository'

describe('ReconcileSocialPublicationsUseCase', () => {
  let engine: InMemorySocialEngineGateway
  let publications: InMemorySocialPublicationRepository
  let sut: ReconcileSocialPublicationsUseCase

  const NOW = new Date('2026-09-14T12:00:00.000Z')
  const SCHEDULED = new Date('2026-09-13T09:00:00.000Z')

  const enginePost = (id: string, state: string, url: string | null = null) => ({
    id,
    content: 'texto',
    publishAt: SCHEDULED,
    state,
    url,
    channelId: 'c1',
    channelName: 'canal',
    provider: 'instagram',
    group: null,
  })

  const givenPublication = async (
    over: Partial<{ customerId: string; groupId: string; postIds: string[] }> = {},
  ) => {
    await publications.create({
      customerId: over.customerId ?? 'customer-1',
      postizGroupId: over.groupId ?? 'g1',
      content: 'texto',
      mode: 'schedule',
      scheduledFor: SCHEDULED,
      createdByUserId: 'user-1',
      targets: (over.postIds ?? ['post-1']).map((id) => ({
        channelId: 'c1',
        provider: 'instagram',
        postizPostId: id,
      })),
    })
  }

  const run = async () => {
    const result = await sut.execute({ now: NOW })
    if (result.isLeft()) throw new Error('não deveria falhar')
    return result.value
  }

  beforeEach(() => {
    engine = new InMemorySocialEngineGateway()
    publications = new InMemorySocialPublicationRepository()
    sut = new ReconcileSocialPublicationsUseCase(publications, engine)
  })

  it('não faz nada quando o motor não está configurado', async () => {
    engine.configured = false
    await givenPublication()

    const out = await run()

    expect(out.checked).toBe(0)
    expect(engine.queueQueries).toEqual([])
  })

  it('não consulta o motor quando não há destino pendente', async () => {
    const out = await run()

    expect(out.checked).toBe(0)
    expect(engine.queueQueries).toEqual([])
  })

  it('marca como publicado quando o motor diz que saiu', async () => {
    await givenPublication()
    engine.queue = [enginePost('post-1', 'PUBLISHED', 'https://instagram.com/p/x')]

    const out = await run()

    expect(out.transitions).toHaveLength(1)
    expect(out.transitions[0]).toMatchObject({ from: 'QUEUE', to: 'PUBLISHED' })
    const [saved] = await publications.findByCustomerId('customer-1')
    expect(saved.targets[0].state).toBe('PUBLISHED')
    expect(saved.targets[0].publishedUrl).toBe('https://instagram.com/p/x')
  })

  it('marca a falha, que é o motivo de existir desta passada', async () => {
    // O webhook do motor só dispara em sucesso; falha só se descobre perguntando.
    await givenPublication()
    engine.queue = [enginePost('post-1', 'ERROR')]

    const out = await run()

    expect(out.transitions[0]).toMatchObject({ to: 'ERROR' })
    expect(out.transitions[0].failureReason).not.toBeNull()
  })

  it('não repete transição quando o estado não mudou', async () => {
    await givenPublication()
    engine.queue = [enginePost('post-1', 'QUEUE')]

    expect((await run()).transitions).toEqual([])
  })

  it('deixa como está o post que sumiu da fila do motor', async () => {
    // Sumir não é desfecho: pode ter sido apagado lá, ou estar fora da janela.
    // Inventar falha seria pior do que esperar a próxima passada.
    await givenPublication()
    engine.queue = []

    const out = await run()

    expect(out.transitions).toEqual([])
    const [saved] = await publications.findByCustomerId('customer-1')
    expect(saved.targets[0].state ?? 'QUEUE').toBe('QUEUE')
  })

  it('para de conferir o que já teve desfecho', async () => {
    await givenPublication()
    engine.queue = [enginePost('post-1', 'PUBLISHED')]
    await run()

    engine.queueQueries = []
    const out = await run()

    expect(out.checked).toBe(0)
    expect(engine.queueQueries).toEqual([])
  })

  it('faz uma consulta por grupo, não uma por destino', async () => {
    // O teto do motor é de 90 requisições por hora; uma por destino estouraria
    // no primeiro cliente com um mês de calendário.
    await givenPublication({ postIds: ['post-1', 'post-2', 'post-3'] })
    engine.queue = [enginePost('post-1', 'PUBLISHED'), enginePost('post-2', 'ERROR')]

    await run()

    expect(engine.queueQueries).toHaveLength(1)
  })

  it('separa a consulta por grupo quando há mais de um cliente', async () => {
    await givenPublication({ customerId: 'customer-1', groupId: 'g1', postIds: ['post-1'] })
    await givenPublication({ customerId: 'customer-2', groupId: 'g2', postIds: ['post-2'] })

    await run()

    expect(engine.queueQueries.map((q) => q.groupId).sort()).toEqual(['g1', 'g2'])
  })

  it('pergunta com folga em volta da data agendada', async () => {
    await givenPublication()

    await run()

    const { from, to } = engine.queueQueries[0]
    expect(from.getTime()).toBeLessThan(SCHEDULED.getTime())
    expect(to.getTime()).toBeGreaterThan(SCHEDULED.getTime())
  })
})
