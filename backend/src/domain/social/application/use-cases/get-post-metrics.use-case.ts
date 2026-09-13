import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { ISocialEngineGateway, PostMetrics } from '../gateways/i-social-engine.gateway'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'
import { CustomerNotLinkedToGroupError } from '../../domain/exceptions/customer-not-linked-to-group.error'
import { PostNotInCustomerQueueError } from '../../domain/exceptions/post-not-in-customer-queue.error'
import { postBelongsToGroup } from '../services/post-ownership'

export interface GetPostMetricsRequest {
  customerId: string
  postId: string
  /** Janela em dias que o motor usa ao perguntar à rede. Padrão 30. */
  days?: number
  now?: Date
}

export type GetPostMetricsResult = Either<
  | CustomerNotFoundError
  | CustomerNotLinkedToGroupError
  | SocialEngineNotConfiguredError
  | PostNotInCustomerQueueError,
  PostMetrics
>

const DEFAULT_DAYS = 30

/**
 * Como este post se saiu na rede.
 *
 * Uma chamada por post, sob demanda: o teto da API pública do motor é de 90
 * requisições por hora, e buscar a métrica de um mês inteiro a cada abertura do
 * feed queimaria o teto sozinha. Ingestão em lote é outro assunto (#1554).
 */
@Injectable()
export class GetPostMetricsUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly engine: ISocialEngineGateway,
  ) {}

  async execute(req: GetPostMetricsRequest): Promise<GetPostMetricsResult> {
    const customer = await this.customers.findById(req.customerId)
    if (!customer) return left(new CustomerNotFoundError(req.customerId))

    const groupId = customer.postizGroupId
    if (!groupId) return left(new CustomerNotLinkedToGroupError(req.customerId))

    if (!this.engine.isConfigured()) {
      return left(new SocialEngineNotConfiguredError())
    }

    const now = req.now ?? new Date()
    // Mesma conferência do cancelamento: o id sozinho serviria para ler métrica
    // de post de outro cliente.
    const owns = await postBelongsToGroup(this.engine, groupId, req.postId, now)
    if (!owns) return left(new PostNotInCustomerQueueError(req.postId))

    return right(await this.engine.getPostMetrics(req.postId, req.days ?? DEFAULT_DAYS))
  }
}
