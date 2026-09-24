import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { ISocialEngineGateway } from '../gateways/i-social-engine.gateway'
import { ISocialPublicationRepository } from '../repositories/i-social-publication.repository'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'
import { CustomerNotLinkedToGroupError } from '../../domain/exceptions/customer-not-linked-to-group.error'
import { PostNotInCustomerQueueError } from '../../domain/exceptions/post-not-in-customer-queue.error'
import { postBelongsToGroup } from '../services/post-ownership'

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
    private readonly publications: ISocialPublicationRepository,
  ) {}

  async execute(req: CancelSocialPostRequest): Promise<CancelSocialPostResult> {
    const customer = await this.customers.findById(req.customerId)
    if (!customer) return left(new CustomerNotFoundError(req.customerId))

    const groupId = customer.postizGroupId
    if (!groupId) return left(new CustomerNotLinkedToGroupError(req.customerId))

    if (!(await this.engine.isConfigured())) {
      return left(new SocialEngineNotConfiguredError())
    }

    const now = req.now ?? new Date()
    const owns = await postBelongsToGroup(this.engine, groupId, req.postId, now)
    if (!owns) return left(new PostNotInCustomerQueueError(req.postId))

    await this.engine.cancelPost(req.postId)

    // Sem isto o nosso registro ficava em QUEUE para sempre: o post some da fila
    // do motor e a reconciliação, por desenho, deixa em paz o que sumiu. O
    // sistema passaria a anunciar um agendamento que nunca vai publicar.
    await this.publications.updateTargetState({
      postizPostId: req.postId,
      state: 'CANCELED',
      checkedAt: now,
    })

    return right({ postId: req.postId })
  }
}
