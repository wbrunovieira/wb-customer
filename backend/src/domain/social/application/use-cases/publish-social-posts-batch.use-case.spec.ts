import { describe, it, expect, beforeEach } from 'vitest'
import { PublishSocialPostsBatchUseCase, BatchItem } from './publish-social-posts-batch.use-case'
import { PublishSocialPostUseCase } from './publish-social-post.use-case'
import { ValidateSocialContentUseCase } from './validate-social-content.use-case'
import { InMemorySocialEngineGateway } from './_test/in-memory-social-engine.gateway'
import { InMemorySocialPublicationRepository } from './_test/in-memory-social-publication.repository'
import { InMemoryCustomerRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-customer.repository'
import { InMemoryCreativeRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-creative.repository'
import { makeCustomer } from '@/domain/creatives/application/use-cases/_test/factories'
import { IStorageAdapter } from '@/domain/documents/application/services/i-storage.adapter'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { CustomerNotLinkedToGroupError } from '../../domain/exceptions/customer-not-linked-to-group.error'
import { EmptyBatchError } from '../../domain/exceptions/empty-batch.error'
import {
  BatchTooLargeError,
  MAX_BATCH_REQUESTS,
} from '../../domain/exceptions/batch-too-large.error'

describe('PublishSocialPostsBatchUseCase', () => {
  let engine: InMemorySocialEngineGateway
  let publications: InMemorySocialPublicationRepository
  let customers: InMemoryCustomerRepository
  let sut: PublishSocialPostsBatchUseCase

  const NOW = new Date('2026-09-14T12:00:00.000Z')

  const item = (over: Partial<BatchItem> = {}): BatchItem => ({
    content: 'Encomende sua peça pelo WhatsApp.',
    channelIds: ['c1'],
    mode: 'schedule',
    scheduledFor: new Date('2026-09-20T13:00:00.000Z'),
    ...over,
  })

  const run = async (items: BatchItem[]) => {
    const result = await sut.execute({
      customerId: 'customer-1',
      items,
      createdByUserId: 'user-1',
      now: NOW,
    })
    if (result.isLeft()) throw new Error('não deveria falhar')
    return result.value
  }

  beforeEach(async () => {
    engine = new InMemorySocialEngineGateway()
    engine.groups = [{ id: 'g1', name: 'Padaria' }]
    engine.channels = [
      // facebook e não instagram: o Instagram exige mídia e estes testes são
      // sobre o lote, não sobre a rede. Com instagram aqui todo item cairia na
      // regra de mídia e o que se quer testar ficaria sem exercício.
      { id: 'c1', name: 'canal', provider: 'facebook', disabled: false, groupId: 'g1' },
    ]

    customers = new InMemoryCustomerRepository()
    const customer = makeCustomer({ id: 'customer-1' })
    customer.linkPostizGroup('g1')
    await customers.save(customer)

    publications = new InMemorySocialPublicationRepository()

    const storage: IStorageAdapter = {
      uploadFile: async () => ({ fileId: 'x', viewUrl: 'x', downloadUrl: 'x' }),
      deleteFile: async () => {},
      downloadFile: async () => Buffer.from('bytes'),
    }

    sut = new PublishSocialPostsBatchUseCase(
      new PublishSocialPostUseCase(
        customers,
        engine,
        publications,
        new ValidateSocialContentUseCase(),
        new InMemoryCreativeRepository(),
        storage,
      ),
      customers,
    )
  })

  it('recusa lote vazio', async () => {
    const result = await sut.execute({
      customerId: 'customer-1',
      items: [],
      createdByUserId: 'user-1',
      now: NOW,
    })

    expect(result.value).toBeInstanceOf(EmptyBatchError)
  })

  it('recusa lote acima do teto, que existe por causa do limite do motor', async () => {
    const result = await sut.execute({
      customerId: 'customer-1',
      items: Array.from({ length: MAX_BATCH_REQUESTS + 1 }, () => item()),
      createdByUserId: 'user-1',
      now: NOW,
    })

    expect(result.value).toBeInstanceOf(BatchTooLargeError)
  })

  it('conta as imagens no custo, não só os posts', async () => {
    // Com carrossel, um post custa uma chamada mais uma por imagem. Contar
    // posts esconderia isso: vinte posts de cinco imagens são cento e vinte
    // requisições num teto de noventa por hora.
    const comCarrossel = Array.from({ length: 20 }, () =>
      item({ creativeIds: ['c1', 'c2', 'c3', 'c4', 'c5'] }),
    )

    const result = await sut.execute({
      customerId: 'customer-1',
      items: comCarrossel,
      createdByUserId: 'user-1',
      now: NOW,
    })

    expect(result.value).toBeInstanceOf(BatchTooLargeError)
    // A mensagem precisa dizer o custo, senão "divida o lote" não diz em quanto.
    expect((result.value as Error).message).toContain('120')
  })

  it('aceita lote de texto até o teto de requisições', async () => {
    const result = await sut.execute({
      customerId: 'customer-1',
      items: Array.from({ length: MAX_BATCH_REQUESTS }, () => item()),
      createdByUserId: 'user-1',
      now: NOW,
    })

    expect(result.isRight()).toBe(true)
  })

  it('agenda o lote inteiro quando tudo está certo', async () => {
    const out = await run([item(), item(), item()])

    expect(out.total).toBe(3)
    expect(out.scheduled).toBe(3)
    expect(out.rejected).toBe(0)
    expect(publications.items).toHaveLength(3)
  })

  it('um item ruim NÃO derruba o lote', async () => {
    // Recusar trinta e dois posts por um travessão no décimo quarto seria
    // transformar erro de digitação em tarde perdida.
    const out = await run([
      item(),
      item({ content: 'Pão quentinho — a partir de R$ 5' }),
      item(),
    ])

    expect(out.scheduled).toBe(2)
    expect(out.rejected).toBe(1)
    expect(publications.items).toHaveLength(2)
  })

  it('diz qual item caiu, pela posição no lote', async () => {
    const out = await run([item(), item({ content: 'Preço — barato' }), item()])

    const rejected = out.results.filter((r) => r.status === 'rejected')
    expect(rejected).toHaveLength(1)
    expect(rejected[0].index).toBe(1)
  })

  it('devolve as violações do item recusado pelas regras da casa', async () => {
    const out = await run([item({ content: 'Pão — a partir de R$ 5' })])

    expect(out.results[0].violations?.length).toBeGreaterThan(0)
  })

  it('mantém a ordem do lote enviado', async () => {
    const out = await run([item(), item(), item()])

    expect(out.results.map((r) => r.index)).toEqual([0, 1, 2])
  })

  it('devolve o id da publicação de cada item aceito', async () => {
    const out = await run([item(), item()])

    for (const result of out.results) {
      expect(result.publicationId).toBeTruthy()
      expect(result.targets).toHaveLength(1)
    }
  })

  it('recusa item com data no passado sem afetar os outros', async () => {
    const out = await run([
      item(),
      item({ scheduledFor: new Date('2020-01-01T10:00:00.000Z') }),
    ])

    expect(out.scheduled).toBe(1)
    expect(out.results[1].status).toBe('rejected')
  })

  it('recusa item com canal de outro grupo sem afetar os outros', async () => {
    const out = await run([item(), item({ channelIds: ['fantasma'] })])

    expect(out.scheduled).toBe(1)
    expect(out.results[1].error).toContain('fantasma')
  })

  it('transforma exceção do motor em recusa daquele item, sem abortar o lote', async () => {
    // Deixar a exceção subir abortaria o lote — exatamente o que esta rota
    // existe para evitar.
    let call = 0
    const original = engine.publish.bind(engine)
    engine.publish = async (input) => {
      call += 1
      if (call === 2) throw new Error('Postiz respondeu 429')
      return original(input)
    }

    const out = await run([item(), item(), item()])

    expect(out.scheduled).toBe(2)
    expect(out.results[1].error).toContain('429')
  })

  it('publica em série, para não estourar o teto do motor de uma vez', async () => {
    const out = await run([item(), item(), item()])

    // Três publicações, três chamadas — e nenhuma perdida por concorrência.
    expect(engine.published).toHaveLength(3)
    expect(out.scheduled).toBe(3)
  })

  it('recusa o PEDIDO quando o cliente não existe, em vez de recusar item a item', async () => {
    // Devolver 201 com trinta e duas recusas idênticas seria tecnicamente
    // verdade e inútil para quem chamou.
    const result = await sut.execute({
      customerId: 'nao-existe',
      items: [item(), item()],
      createdByUserId: 'user-1',
      now: NOW,
    })

    expect(result.value).toBeInstanceOf(CustomerNotFoundError)
  })

  it('recusa o PEDIDO quando o cliente não tem grupo ligado', async () => {
    await customers.save(makeCustomer({ id: 'customer-solto' }))

    const result = await sut.execute({
      customerId: 'customer-solto',
      items: [item()],
      createdByUserId: 'user-1',
      now: NOW,
    })

    expect(result.value).toBeInstanceOf(CustomerNotLinkedToGroupError)
  })

  it('não publica nada quando o pedido é reprovado', async () => {
    await sut.execute({
      customerId: 'nao-existe',
      items: [item(), item()],
      createdByUserId: 'user-1',
      now: NOW,
    })

    expect(engine.published).toHaveLength(0)
    expect(publications.items).toHaveLength(0)
  })
})