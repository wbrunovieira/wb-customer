import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { ISocialEngineGateway, QueuedPost } from '../gateways/i-social-engine.gateway'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'
import { CustomerNotLinkedToGroupError } from '../../domain/exceptions/customer-not-linked-to-group.error'
import { InvalidScheduleDateError } from '../../domain/exceptions/invalid-schedule-date.error'

export interface GetSocialQueueRequest {
  customerId: string
  from?: Date
  to?: Date
  /** Costura de teste; em produção é o relógio. */
  now?: Date
}

export interface GetSocialQueueResponse {
  from: Date
  to: Date
  posts: QueuedPost[]
}

export type GetSocialQueueResult = Either<
  | CustomerNotFoundError
  | CustomerNotLinkedToGroupError
  | SocialEngineNotConfiguredError
  | InvalidScheduleDateError,
  GetSocialQueueResponse
>

/** Janela padrão: o mês à frente, que é o horizonte do plano editorial. */
const DEFAULT_DAYS_AHEAD = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * O que está na fila deste cliente.
 *
 * Sem isto a centralização não existe: seria preciso abrir o motor para saber o
 * que vai sair, e o wb-customer só saberia o que ele mesmo mandou — perdendo de
 * vista qualquer post criado direto lá.
 */
@Injectable()
export class GetSocialQueueUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly engine: ISocialEngineGateway,
  ) {}

  async execute(req: GetSocialQueueRequest): Promise<GetSocialQueueResult> {
    const customer = await this.customers.findById(req.customerId)
    if (!customer) return left(new CustomerNotFoundError(req.customerId))

    const groupId = customer.postizGroupId
    if (!groupId) return left(new CustomerNotLinkedToGroupError(req.customerId))

    if (!(await this.engine.isConfigured())) {
      return left(new SocialEngineNotConfiguredError())
    }

    const now = req.now ?? new Date()
    const from = req.from ?? startOfDay(now)
    const to = req.to ?? new Date(from.getTime() + DEFAULT_DAYS_AHEAD * MS_PER_DAY)

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
      // Ordem cronológica: a agenda é lida de cima para baixo como o tempo passa.
      posts: [...posts].sort((a, b) => a.publishAt.getTime() - b.publishAt.getTime()),
    })
  }
}

function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}
