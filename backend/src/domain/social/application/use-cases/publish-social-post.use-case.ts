import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import {
  ISocialEngineGateway,
  SocialChannel,
  UploadedMedia,
} from '../gateways/i-social-engine.gateway'
import { ICreativeRepository } from '@/domain/creatives/application/repositories/i-creative.repository'
import { IStorageAdapter } from '@/domain/documents/application/services/i-storage.adapter'
import { CreativeNotFoundError } from '@/domain/creatives/domain/exceptions/creative-not-found.error'
import { CreativeHasNoFileError } from '../../domain/exceptions/creative-has-no-file.error'
import {
  SUPPORTED_MEDIA_TYPES,
  UnsupportedMediaTypeError,
} from '../../domain/exceptions/unsupported-media-type.error'
import {
  MAX_CAROUSEL_ITEMS,
  TooManyCarouselItemsError,
} from '../../domain/exceptions/too-many-carousel-items.error'
import { ISocialPublicationRepository } from '../repositories/i-social-publication.repository'
import { ValidateSocialContentUseCase } from './validate-social-content.use-case'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'
import { CustomerNotLinkedToGroupError } from '../../domain/exceptions/customer-not-linked-to-group.error'
import { ContentRulesViolationError } from '../../domain/exceptions/content-rules-violation.error'
import { ChannelNotAvailableError } from '../../domain/exceptions/channel-not-available.error'
import { InvalidScheduleDateError } from '../../domain/exceptions/invalid-schedule-date.error'

export interface PublishSocialPostRequest {
  customerId: string
  content: string
  /** Canais de destino. Vários cobrem o espelho entre redes numa chamada só. */
  channelIds: string[]
  mode: 'now' | 'schedule'
  /** Obrigatório em 'schedule'; ignorado em 'now'. */
  scheduledFor?: Date
  attributionLinkId?: string | null
  /** Um criativo. Mantido porque agentes já chamam assim. */
  creativeId?: string | null
  /** Vários criativos, NA ORDEM do carrossel. Tem precedência sobre creativeId. */
  creativeIds?: string[]
  createdByUserId: string
  /** Costura de teste; em produção é o relógio. */
  now?: Date
}

export interface PublishSocialPostResponse {
  publicationId: string
  scheduledFor: Date
  targets: {
    channelId: string
    provider: string
    postizPostId: string
  }[]
}

export type PublishSocialPostResult = Either<
  | CreativeNotFoundError
  | CreativeHasNoFileError
  | UnsupportedMediaTypeError
  | TooManyCarouselItemsError
  | CustomerNotFoundError
  | CustomerNotLinkedToGroupError
  | ContentRulesViolationError
  | SocialEngineNotConfiguredError
  | ChannelNotAvailableError
  | InvalidScheduleDateError,
  PublishSocialPostResponse
>

/**
 * Publica ou agenda, com a decisão inteira tomada aqui.
 *
 * A ordem importa: o texto passa pelas regras da casa ANTES de chegar ao motor.
 * Validar depois seria validar o que já saiu. E o agendamento vive aqui porque
 * a API do Instagram não agenda — media_publish não aceita data futura —, então
 * quem guarda a fila é o motor, acionado por esta decisão.
 *
 * O que o motor devolve é um id de post POR CANAL, e é esse id que grava o
 * caminho de volta para as métricas.
 */
@Injectable()
export class PublishSocialPostUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly engine: ISocialEngineGateway,
    private readonly publications: ISocialPublicationRepository,
    private readonly validateContent: ValidateSocialContentUseCase,
    private readonly creatives: ICreativeRepository,
    private readonly storage: IStorageAdapter,
  ) {}

  async execute(req: PublishSocialPostRequest): Promise<PublishSocialPostResult> {
    const customer = await this.customers.findById(req.customerId)
    if (!customer) return left(new CustomerNotFoundError(req.customerId))

    const groupId = customer.postizGroupId
    if (!groupId) return left(new CustomerNotLinkedToGroupError(req.customerId))

    // Antes do motor, sempre: validar depois seria validar o que já saiu.
    const validation = this.validateContent.execute({ content: req.content })
    if (validation.isRight() && !validation.value.ok) {
      return left(new ContentRulesViolationError(validation.value.violations))
    }

    if (!this.engine.isConfigured()) {
      return left(new SocialEngineNotConfiguredError())
    }

    const now = req.now ?? new Date()
    const date = this.resolveDate(req, now)
    if (date instanceof InvalidScheduleDateError) return left(date)

    const channels = await this.engine.listChannels()
    const chosen: SocialChannel[] = []

    for (const channelId of req.channelIds) {
      const channel = channels.find((c) => c.id === channelId)

      // Canal de outro cliente é o erro caro: publicaria na conta errada.
      if (!channel || channel.groupId !== groupId) {
        return left(new ChannelNotAvailableError(channelId, 'not-in-group'))
      }
      // Canal desativado engoliria o post calado.
      if (channel.disabled) {
        return left(new ChannelNotAvailableError(channelId, 'disabled'))
      }

      chosen.push(channel)
    }

    if (chosen.length === 0) {
      return left(new ChannelNotAvailableError('', 'not-in-group'))
    }

    // A mídia sobe antes do post porque o post a referencia por id do motor.
    // Se a publicação falhar depois disto, fica um arquivo órfão lá — melhor do
    // que um post publicado apontando para mídia que não existe.
    const media = await this.resolveMedia(req)
    if (media instanceof Error) return left(media)

    const published = await this.engine.publish({
      channels: chosen.map((c) => ({ id: c.id, provider: c.provider })),
      content: req.content,
      mode: req.mode,
      date,
      media,
    })

    const targets = published.map((p) => ({
      channelId: p.channelId,
      provider: chosen.find((c) => c.id === p.channelId)?.provider ?? 'desconhecido',
      postizPostId: p.postId,
    }))

    const publicationId = await this.publications.create({
      customerId: req.customerId,
      postizGroupId: groupId,
      content: req.content,
      mode: req.mode,
      scheduledFor: date,
      attributionLinkId: req.attributionLinkId ?? null,
      creativeIds: chosenCreativeIds(req),
      createdByUserId: req.createdByUserId,
      targets,
    })

    return right({ publicationId, scheduledFor: date, targets })
  }

  /**
   * Leva a arte do criativo até o motor, quando há criativo escolhido.
   *
   * O arquivo mora no Drive e o motor não consegue buscá-lo de lá: ele valida a
   * extensão do caminho e, quando configurado, exige que o caminho seja do
   * próprio domínio. Então o conteúdo é baixado aqui e reenviado.
   */
  private async resolveMedia(
    req: PublishSocialPostRequest,
  ): Promise<
    | UploadedMedia[]
    | undefined
    | CreativeNotFoundError
    | CreativeHasNoFileError
    | UnsupportedMediaTypeError
  > {
    const ids = chosenCreativeIds(req)
    if (ids.length === 0) return undefined
    if (ids.length > MAX_CAROUSEL_ITEMS) {
      return new TooManyCarouselItemsError(ids.length)
    }

    // Duas passadas: confere TODOS antes de transferir QUALQUER um. Um formato
    // inválido na quinta imagem não pode deixar quatro arquivos órfãos no motor.
    const creatives = []
    for (const id of ids) {
      const creative = await this.creatives.findById(id)
      if (!creative || creative.customerId !== req.customerId || creative.isDeleted) {
        return new CreativeNotFoundError(id)
      }
      if (!creative.driveFileId) return new CreativeHasNoFileError(id)

      const mimeType = creative.mimeType
      if (!mimeType || !SUPPORTED_MEDIA_TYPES.includes(mimeType as never)) {
        return new UnsupportedMediaTypeError(mimeType)
      }

      creatives.push({ creative, mimeType, driveFileId: creative.driveFileId })
    }

    const media: UploadedMedia[] = []
    // Em ordem e em série: a ordem é o carrossel, e cada imagem custa uma
    // requisição das noventa por hora que o motor concede.
    for (const { creative, mimeType, driveFileId } of creatives) {
      const buffer = await this.storage.downloadFile(driveFileId)
      media.push(
        await this.engine.uploadMedia({
          fileName: mediaFileName(creative.title, mimeType),
          mimeType,
          buffer,
        }),
      )
    }

    return media
  }

  /**
   * 'now' usa o relógio; 'schedule' exige data futura. Agendar para o passado
   * não é pedido válido: o motor publicaria imediatamente, o que é o contrário
   * do que se pediu.
   */
  private resolveDate(
    req: PublishSocialPostRequest,
    now: Date,
  ): Date | InvalidScheduleDateError {
    if (req.mode === 'now') return now

    if (!req.scheduledFor) {
      return new InvalidScheduleDateError('Agendamento exige scheduledFor.')
    }
    if (Number.isNaN(req.scheduledFor.getTime())) {
      return new InvalidScheduleDateError('Data de agendamento inválida.')
    }
    if (req.scheduledFor.getTime() <= now.getTime()) {
      return new InvalidScheduleDateError(
        'Agendamento precisa de uma data futura; para publicar já, use mode "now".',
      )
    }

    return req.scheduledFor
  }
}


/**
 * Os criativos do pedido, na ordem. creativeIds tem precedência; creativeId
 * segue aceito porque agentes já chamam assim.
 */
function chosenCreativeIds(req: PublishSocialPostRequest): string[] {
  if (req.creativeIds?.length) return req.creativeIds
  return req.creativeId ? [req.creativeId] : []
}

/** Extensão por tipo, porque o motor valida a extensão do caminho da mídia. */
const EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
}

/**
 * Nome do arquivo enviado ao motor. A extensão não é enfeite: o motor recusa o
 * post quando o caminho da mídia não termina em extensão conhecida.
 */
function mediaFileName(title: string, mimeType: string): string {
  const slug =
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'criativo'

  return `${slug}.${EXTENSION[mimeType] ?? 'png'}`
}
