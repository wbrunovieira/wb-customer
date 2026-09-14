import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { ISocialEngineGateway, QueuedPost } from '../gateways/i-social-engine.gateway'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'
import { CustomerNotLinkedToGroupError } from '../../domain/exceptions/customer-not-linked-to-group.error'
import { InvalidScheduleDateError } from '../../domain/exceptions/invalid-schedule-date.error'

export interface GetSocialFeedRequest {
  customerId: string
  from?: Date
  to?: Date
  now?: Date
}

export interface GetSocialFeedResponse {
  from: Date
  to: Date
  posts: QueuedPost[]
}

export type GetSocialFeedResult = Either<
  | CustomerNotFoundError
  | CustomerNotLinkedToGroupError
  | SocialEngineNotConfiguredError
  | InvalidScheduleDateError,
  GetSocialFeedResponse
>

const DEFAULT_DAYS_BACK = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** O que já saiu: publicado, ou tentou sair e falhou. */
const PUBLISHED_STATES = ['PUBLISHED', 'ERROR']

/**
 * O que já foi publicado para este cliente.
 *
 * É a agenda olhando para trás. Rascunho e post ainda na fila ficam de fora —
 * eles pertencem à agenda, e misturá-los aqui faria o feed responder "o que vai
 * sair" quando a pergunta é "o que saiu".
 *
 * Falha entra junto com sucesso de propósito: um post que não saiu é a notícia
 * mais importante do feed, e escondê-lo faria o silêncio parecer sucesso.
 */
@Injectable()
export class GetSocialFeedUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly engine: ISocialEngineGateway,
  ) {}

  async execute(req: GetSocialFeedRequest): Promise<GetSocialFeedResult> {
    const customer = await this.customers.findById(req.customerId)
    if (!customer) return left(new CustomerNotFoundError(req.customerId))

    const groupId = customer.postizGroupId
    if (!groupId) return left(new CustomerNotLinkedToGroupError(req.customerId))

    if (!this.engine.isConfigured()) {
      return left(new SocialEngineNotConfiguredError())
    }

    const now = req.now ?? new Date()
    const to = req.to ?? now
    const from = req.from ?? new Date(to.getTime() - DEFAULT_DAYS_BACK * MS_PER_DAY)

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return left(new InvalidScheduleDateError('Janela inválida.'))
    }
    if (from.getTime() > to.getTime()) {
      return left(
        new InvalidScheduleDateError('Janela inválida: o início vem depois do fim.'),
      )
    }

    const posts = await this.engine.listQueue({ groupId, from, to })

    return right({
      from,
      to,
      posts: posts
        .filter((p) => PUBLISHED_STATES.includes(p.state))
        // Do mais recente para o mais antigo: feed se lê de cima, e o que
        // acabou de sair é o que se quer ver primeiro.
        .sort((a, b) => b.publishAt.getTime() - a.publishAt.getTime()),
    })
  }
}
