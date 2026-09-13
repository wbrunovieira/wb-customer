import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { ISocialEngineGateway } from '../gateways/i-social-engine.gateway'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'
import { CustomerNotLinkedToGroupError } from '../../domain/exceptions/customer-not-linked-to-group.error'
import { PostNotInCustomerQueueError } from '../../domain/exceptions/post-not-in-customer-queue.error'

export interface CancelSocialPostRequest {
  customerId: string
  postId: string
  now?: Date
}

export interface CancelSocialPostResponse {
  postId: string
}

export type CancelSocialPostResult = Either<
  | CustomerNotFoundError
  | CustomerNotLinkedToGroupError
  | SocialEngineNotConfiguredError
  | PostNotInCustomerQueueError,
  CancelSocialPostResponse
>

/**
 * Quantos dias para trás e para frente olhar ao confirmar que o post é mesmo
 * deste cliente. Largo de propósito: o custo é uma consulta, e o erro que ele
 * evita é apagar post de outro cliente.
 */
const OWNERSHIP_WINDOW_DAYS = 400
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Tira o post da fila.
 *
 * Confere antes que o post pertence ao grupo deste cliente. O motor aceitaria o
 * id sozinho e apagaria qualquer post da organização — quem chama informa o
 * cliente, e é essa combinação que precisa bater. Apagar é irreversível e
 * atinge todas as redes em que o post foi espelhado.
 */
@Injectable()
export class CancelSocialPostUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly engine: ISocialEngineGateway,
  ) {}

  async execute(req: CancelSocialPostRequest): Promise<CancelSocialPostResult> {
    const customer = await this.customers.findById(req.customerId)
    if (!customer) return left(new CustomerNotFoundError(req.customerId))

    const groupId = customer.postizGroupId
    if (!groupId) return left(new CustomerNotLinkedToGroupError(req.customerId))

    if (!this.engine.isConfigured()) {
      return left(new SocialEngineNotConfiguredError())
    }

    const now = req.now ?? new Date()
    const span = OWNERSHIP_WINDOW_DAYS * MS_PER_DAY
    const queue = await this.engine.listQueue({
      groupId,
      from: new Date(now.getTime() - span),
      to: new Date(now.getTime() + span),
    })

    if (!queue.some((p) => p.id === req.postId)) {
      return left(new PostNotInCustomerQueueError(req.postId))
    }

    await this.engine.cancelPost(req.postId)

    return right({ postId: req.postId })
  }
}
