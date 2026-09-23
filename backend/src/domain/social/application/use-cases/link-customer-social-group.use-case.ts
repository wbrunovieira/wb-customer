import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { ISocialEngineGateway } from '../gateways/i-social-engine.gateway'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'
import { SocialGroupNotFoundError } from '../../domain/exceptions/social-group-not-found.error'
import { SocialGroupAlreadyLinkedError } from '../../domain/exceptions/social-group-already-linked.error'

export interface LinkCustomerSocialGroupRequest {
  customerId: string
  /** null desfaz o vínculo, que é como se corrige um apontamento errado. */
  groupId: string | null
}

export interface LinkCustomerSocialGroupResponse {
  customerId: string
  postizGroupId: string | null
  groupName: string | null
}

export type LinkCustomerSocialGroupResult = Either<
  | CustomerNotFoundError
  | SocialEngineNotConfiguredError
  | SocialGroupNotFoundError
  | SocialGroupAlreadyLinkedError,
  LinkCustomerSocialGroupResponse
>

/**
 * Diz em qual conta do motor os posts deste cliente saem.
 *
 * O vínculo é por id guardado em coluna, não por nome: nome de grupo é editável
 * no motor e bater string quebraria calado, publicando na conta errada — o pior
 * erro possível aqui.
 */
@Injectable()
export class LinkCustomerSocialGroupUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly engine: ISocialEngineGateway,
  ) {}

  async execute(
    req: LinkCustomerSocialGroupRequest,
  ): Promise<LinkCustomerSocialGroupResult> {
    const customer = await this.customers.findById(req.customerId)
    if (!customer) return left(new CustomerNotFoundError(req.customerId))

    // Desfazer não consulta o motor: tem de funcionar mesmo com ele fora do ar,
    // senão um vínculo errado fica preso justamente quando há incidente.
    if (req.groupId === null) {
      customer.linkPostizGroup(null)
      await this.customers.save(customer)

      return right({
        customerId: customer.id.value,
        postizGroupId: null,
        groupName: null,
      })
    }

    if (!(await this.engine.isConfigured())) {
      return left(new SocialEngineNotConfiguredError())
    }

    const groups = await this.engine.listGroups()
    const group = groups.find((g) => g.id === req.groupId)
    if (!group) return left(new SocialGroupNotFoundError(req.groupId))

    const owner = await this.customers.findByPostizGroupId(req.groupId)
    if (owner && owner.id.value !== customer.id.value) {
      return left(new SocialGroupAlreadyLinkedError(req.groupId, owner.name))
    }

    customer.linkPostizGroup(group.id)
    await this.customers.save(customer)

    return right({
      customerId: customer.id.value,
      postizGroupId: group.id,
      groupName: group.name,
    })
  }
}
