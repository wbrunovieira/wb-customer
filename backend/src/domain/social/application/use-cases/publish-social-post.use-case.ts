import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import {
  ISocialEngineGateway,
  SocialChannel,
} from '../gateways/i-social-engine.gateway'
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
  creativeId?: string | null
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

    const published = await this.engine.publish({
      channelIds: chosen.map((c) => c.id),
      content: req.content,
      mode: req.mode,
      date,
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
      creativeId: req.creativeId ?? null,
      createdByUserId: req.createdByUserId,
      targets,
    })

    return right({ publicationId, scheduledFor: date, targets })
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
