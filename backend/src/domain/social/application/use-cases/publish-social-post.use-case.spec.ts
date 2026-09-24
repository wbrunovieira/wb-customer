import { describe, it, expect, beforeEach } from 'vitest'
import { PublishSocialPostUseCase } from './publish-social-post.use-case'
import { ValidateSocialContentUseCase } from './validate-social-content.use-case'
import { InMemorySocialEngineGateway } from './_test/in-memory-social-engine.gateway'
import { InMemorySocialPublicationRepository } from './_test/in-memory-social-publication.repository'
import { InMemoryCustomerRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-customer.repository'
import { InMemoryCreativeRepository } from '@/domain/creatives/application/use-cases/_test/in-memory-creative.repository'
import { makeCustomer, makeCreative } from '@/domain/creatives/application/use-cases/_test/factories'
import { IStorageAdapter } from '@/domain/documents/application/services/i-storage.adapter'
import { CreativeNotFoundError } from '@/domain/creatives/domain/exceptions/creative-not-found.error'
import { CreativeHasNoFileError } from '../../domain/exceptions/creative-has-no-file.error'
import { UnsupportedMediaTypeError } from '../../domain/exceptions/unsupported-media-type.error'
import { TooManyCarouselItemsError } from '../../domain/exceptions/too-many-carousel-items.error'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { CustomerNotLinkedToGroupError } from '../../domain/exceptions/customer-not-linked-to-group.error'
import { ContentRulesViolationError } from '../../domain/exceptions/content-rules-violation.error'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'
import { SocialEngineFailureError } from '../../domain/exceptions/social-engine-failure.error'
import { MediaRequiredError } from '../../domain/exceptions/media-required.error'
import { ChannelNotAvailableError } from '../../domain/exceptions/channel-not-available.error'
import { InvalidScheduleDateError } from '../../domain/exceptions/invalid-schedule-date.error'

describe('PublishSocialPostUseCase', () => {
  let engine: InMemorySocialEngineGateway
  let customers: InMemoryCustomerRepository
  let publications: InMemorySocialPublicationRepository
  let creatives: InMemoryCreativeRepository
  let storage: IStorageAdapter
  let downloaded: string[]
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

  // O Instagram recusa post sem mídia, então todo teste que publica nele
  // precisa de arte. Antes isto passava porque o dublê do motor não conhecia a
  // regra — os testes exercitavam um cenário que a Meta nunca aceitaria.
  const comArte = async (id = 'creative-1') => {
    const creative = makeCreative({ customerId: 'customer-1', title: 'Arte da semana' }, id)
    creative.attachDriveFile({
      driveFileId: 'drive-1',
      driveViewUrl: 'https://drive/view',
      driveDownloadUrl: 'https://drive/download',
      mimeType: 'image/png',
      sizeBytes: null,
      thumbnailUrl: null,
    })
    await creatives.save(creative)
    return creative
  }

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
    creatives = new InMemoryCreativeRepository()
    downloaded = []
    storage = {
      uploadFile: async () => ({ fileId: 'x', viewUrl: 'x', downloadUrl: 'x' }),
      deleteFile: async () => {},
      downloadFile: async (fileId: string) => {
        downloaded.push(fileId)
        return Buffer.from('bytes-da-arte')
      },
    }
    sut = new PublishSocialPostUseCase(
      customers,
      engine,
      publications,
      new ValidateSocialContentUseCase(),
      creatives,
      storage,
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

  it('recusa post no Instagram sem mídia — regra da Meta, não do motor', async () => {
    const result = await publish()

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(MediaRequiredError)
  })

  it('recusa antes de falar com o motor, para não gastar requisição do teto', async () => {
    // O teto é de 90/hora e é compartilhado com quem publica de verdade. Mandar
    // um post que já se sabe que será recusado gasta uma delas à toa.
    await publish()

    expect(engine.published).toHaveLength(0)
    expect(engine.uploads).toHaveLength(0)
  })

  it('a mensagem diz qual rede e o que enviar', async () => {
    const result = await publish()

    const msg = (result.value as Error).message
    expect(msg).toContain('instagram')
    expect(msg).toContain('creativeId')
  })

  it('aceita texto puro no Facebook, que não exige mídia', async () => {
    const result = await publish({ channelIds: ['c2'] })

    expect(result.isRight()).toBe(true)
  })

  it('basta um canal exigir mídia para o post inteiro ser recusado', async () => {
    // O post é um só, espelhado entre redes: publicar no Facebook e falhar no
    // Instagram deixaria o cliente com metade do espelho.
    const result = await publish({ channelIds: ['c1', 'c2'] })

    expect(result.value).toBeInstanceOf(MediaRequiredError)
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
    await comArte()
    const result = await publish({ creativeId: 'creative-1' })

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(result.value.scheduledFor).toEqual(FUTURE)
    expect(engine.published[0].mode).toBe('schedule')
  })

  it('publica já com mode now, usando o relógio', async () => {
    await comArte()
    const result = await publish({ creativeId: 'creative-1', mode: 'now', scheduledFor: undefined })

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(result.value.scheduledFor).toEqual(NOW)
  })

  it('entrega vários canais numa chamada só', async () => {
    await comArte()
    // É assim que o espelho entre redes sai junto.
    const result = await publish({ channelIds: ['c1', 'c2'], creativeId: 'creative-1' })

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(engine.published).toHaveLength(1)
    expect(engine.published[0].channels.map((c) => c.id)).toEqual(['c1', 'c2'])
    expect(result.value.targets).toHaveLength(2)
  })

  it('leva o provedor junto do canal, porque o motor valida por rede', async () => {
    await comArte()
    // O Instagram exige post_type nas configurações do post; Facebook e
    // LinkedIn não. Sem saber a rede de cada canal, o adapter mandava o mesmo
    // objeto vazio para todos, e o Instagram recusava o post na validação.
    const result = await publish({ channelIds: ['c1', 'c2'], creativeId: 'creative-1' })

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(engine.published[0].channels).toEqual([
      { id: 'c1', provider: 'instagram' },
      { id: 'c2', provider: 'facebook' },
    ])
  })

  it('guarda o id de post de cada canal, que é a volta para as métricas', async () => {
    await comArte()
    const result = await publish({ channelIds: ['c1', 'c2'], creativeId: 'creative-1' })

    if (result.isLeft()) throw new Error('não deveria falhar')
    const saved = await publications.findByPostizPostId('post-c2')
    expect(saved?.id).toBe(result.value.publicationId)
    expect(saved?.targets.map((t) => t.postizPostId).sort()).toEqual(['post-c1', 'post-c2'])
  })

  it('guarda a rede de cada destino', async () => {
    await comArte()
    const result = await publish({ channelIds: ['c1', 'c2'], creativeId: 'creative-1' })

    if (result.isLeft()) throw new Error('não deveria falhar')
    expect(result.value.targets.map((t) => t.provider).sort()).toEqual([
      'facebook',
      'instagram',
    ])
  })

  it('guarda o grupo usado, para a auditoria não mudar quando o vínculo mudar', async () => {
    await comArte()
    await publish({ creativeId: 'creative-1' })

    const [saved] = await publications.findByCustomerId('customer-1')
    expect(saved.postizGroupId).toBe('g1')
  })

  it('guarda o vínculo com o link de atribuição e o criativo', async () => {
    // Desde que a arte passou a viajar junto, informar um criativo significa
    // publicar com ele — então o criativo precisa existir e ter arquivo.
    const creative = makeCreative({ customerId: 'customer-1' }, 'creative-1')
    creative.attachDriveFile({
      driveFileId: 'drive-1',
      driveViewUrl: 'https://drive/view',
      driveDownloadUrl: 'https://drive/download',
      mimeType: 'image/png',
      sizeBytes: null,
      thumbnailUrl: null,
    })
    await creatives.save(creative)

    await publish({ attributionLinkId: 'link-1', creativeId: 'creative-1' })

    const [saved] = await publications.findByCustomerId('customer-1')
    expect(saved.attributionLinkId).toBe('link-1')
    expect(saved.creativeIds).toEqual(['creative-1'])
  })

  it('não grava publicação quando o motor recusa a entrega', async () => {
    // Gravar aqui criaria um post que existe no wb-customer e não na rede.
    await comArte()
    engine.failOnPublish = new Error(
      'Postiz respondeu 400 em posts: {"message":"Should have at least one media"}',
    )

    const result = await publish({ creativeId: 'creative-1' })

    // Erro do motor volta como recusa com o motivo DELE, não como 500 genérico:
    // a mensagem é o que diz a quem integra o que corrigir, e antes disto ela
    // ficava só no log do servidor.
    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(SocialEngineFailureError)
    expect((result.value as Error).message).toContain('at least one media')
    expect(publications.items).toHaveLength(0)
  })

  describe('mídia do criativo', () => {
    const withFile = async (over: Partial<{ mimeType: string; driveFileId: string; title: string }> = {}) => {
      const creative = makeCreative({ customerId: 'customer-1', title: over.title ?? 'Arte da semana' }, 'creative-1')
      creative.attachDriveFile({
        driveFileId: over.driveFileId ?? 'drive-1',
        driveViewUrl: 'https://drive/view',
        driveDownloadUrl: 'https://drive/download',
        mimeType: over.mimeType ?? 'image/png',
        sizeBytes: null,
        thumbnailUrl: null,
      })
      await creatives.save(creative)
      return creative
    }

    it('não sobe nada quando não há criativo escolhido', async () => {
      // No Facebook, que aceita texto puro — no Instagram a recusa por falta de
      // mídia vem antes e o teste não provaria nada sobre upload.
      await publish({ channelIds: ['c2'] })

      expect(engine.uploads).toHaveLength(0)
    })

    it('recusa criativo inexistente', async () => {
      const result = await publish({ creativeId: 'fantasma' })

      expect(result.value).toBeInstanceOf(CreativeNotFoundError)
    })

    it('recusa criativo de outro cliente', async () => {
      const alheio = makeCreative({ customerId: 'outro-cliente' }, 'creative-alheio')
      await creatives.save(alheio)

      const result = await publish({ creativeId: 'creative-alheio' })

      expect(result.value).toBeInstanceOf(CreativeNotFoundError)
    })

    it('recusa criativo sem arquivo enviado', async () => {
      await creatives.save(makeCreative({ customerId: 'customer-1' }, 'creative-1'))

      const result = await publish({ creativeId: 'creative-1' })

      expect(result.value).toBeInstanceOf(CreativeHasNoFileError)
    })

    it('recusa formato que as redes não aceitam', async () => {
      await withFile({ mimeType: 'application/pdf' })

      const result = await publish({ creativeId: 'creative-1' })

      expect(result.value).toBeInstanceOf(UnsupportedMediaTypeError)
    })

    it('recusa o formato antes de baixar e subir o arquivo', async () => {
      // O motor rejeitaria no fim, depois de duas transferências inteiras.
      await withFile({ mimeType: 'application/pdf' })

      await publish({ creativeId: 'creative-1' })

      expect(downloaded).toEqual([])
      expect(engine.uploads).toHaveLength(0)
    })

    it('baixa a arte do storage e envia ao motor', async () => {
      await withFile()

      const result = await publish({ creativeId: 'creative-1' })

      expect(result.isRight()).toBe(true)
      expect(downloaded).toEqual(['drive-1'])
      expect(engine.uploads).toHaveLength(1)
      expect(engine.uploads[0].mimeType).toBe('image/png')
    })

    it('manda o arquivo com extensão, que é o que o motor valida', async () => {
      await withFile({ title: 'Promoção de Páscoa!' })

      await publish({ creativeId: 'creative-1' })

      expect(engine.uploads[0].fileName).toBe('promocao-de-pascoa.png')
    })

    it('leva a mídia junto do post', async () => {
      await withFile()

      await publish({ creativeId: 'creative-1' })

      expect(engine.published[0].media).toEqual([
        { id: 'media-1', path: 'https://motor.example/uploads/media-1.png' },
      ])
    })

    it('não grava publicação quando o motor recusa o arquivo', async () => {
      await withFile()
      engine.failOnUpload = new Error('Postiz respondeu 400 ao subir a mídia')

      await expect(publish({ creativeId: 'creative-1' })).rejects.toThrow('subir a mídia')
      expect(publications.items).toHaveLength(0)
    })
  })

  describe('carrossel', () => {
    const arte = async (id: string, title = `Arte ${id}`) => {
      const creative = makeCreative({ customerId: 'customer-1', title }, id)
      creative.attachDriveFile({
        driveFileId: `drive-${id}`,
        driveViewUrl: 'https://drive/view',
        driveDownloadUrl: 'https://drive/download',
        mimeType: 'image/png',
        sizeBytes: null,
        thumbnailUrl: null,
      })
      await creatives.save(creative)
      return creative
    }

    it('leva vários criativos no mesmo post', async () => {
      await arte('c1')
      await arte('c2')
      await arte('c3')

      const result = await publish({ creativeIds: ['c1', 'c2', 'c3'] })

      expect(result.isRight()).toBe(true)
      expect(engine.published[0].media).toHaveLength(3)
    })

    it('respeita a ordem escolhida, que é o que se vê ao deslizar', async () => {
      await arte('c1', 'Primeira')
      await arte('c2', 'Segunda')

      await publish({ creativeIds: ['c2', 'c1'] })

      expect(engine.uploads.map((u) => u.fileName)).toEqual(['segunda.png', 'primeira.png'])
    })

    it('grava os criativos usados, na ordem', async () => {
      await arte('c1')
      await arte('c2')

      await publish({ creativeIds: ['c1', 'c2'] })

      const [saved] = await publications.findByCustomerId('customer-1')
      expect(saved.creativeIds).toEqual(['c1', 'c2'])
    })

    it('recusa mais imagens do que a rede aceita', async () => {
      for (let i = 0; i < 11; i++) await arte(`c${i}`)

      const result = await publish({
        creativeIds: Array.from({ length: 11 }, (_, i) => `c${i}`),
      })

      expect(result.value).toBeInstanceOf(TooManyCarouselItemsError)
    })

    it('confere todos antes de transferir qualquer um', async () => {
      // Um formato inválido na terceira imagem não pode deixar duas órfãs no motor.
      await arte('c1')
      await arte('c2')
      const ruim = makeCreative({ customerId: 'customer-1' }, 'c3')
      ruim.attachDriveFile({
        driveFileId: 'drive-c3',
        driveViewUrl: 'https://drive/view',
        driveDownloadUrl: 'https://drive/download',
        mimeType: 'application/pdf',
        sizeBytes: null,
        thumbnailUrl: null,
      })
      await creatives.save(ruim)

      const result = await publish({ creativeIds: ['c1', 'c2', 'c3'] })

      expect(result.value).toBeInstanceOf(UnsupportedMediaTypeError)
      expect(engine.uploads).toHaveLength(0)
      expect(downloaded).toEqual([])
    })

    it('creativeIds tem precedência sobre o creativeId antigo', async () => {
      await arte('c1')
      await arte('c2')

      await publish({ creativeId: 'c1', creativeIds: ['c2'] })

      expect(engine.uploads).toHaveLength(1)
      expect(engine.uploads[0].fileName).toBe('arte-c2.png')
    })
  })
})