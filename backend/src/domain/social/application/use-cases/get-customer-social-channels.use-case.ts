import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import {
  ISocialEngineGateway,
  SocialChannel,
} from '../gateways/i-social-engine.gateway'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'

export interface GetCustomerSocialChannelsRequest {
  customerId: string
}

export interface GetCustomerSocialChannelsResponse {
  /** Falso quando ninguém ligou o cliente a um grupo ainda. */
  linked: boolean
  groupId: string | null
  /** null quando o grupo sumiu do motor depois de ligado. */
  groupName: string | null
  channels: SocialChannel[]
}

export type GetCustomerSocialChannelsResult = Either<
  CustomerNotFoundError | SocialEngineNotConfiguredError,
  GetCustomerSocialChannelsResponse
>

/**
 * Em quais redes este cliente publica hoje. É a resposta que decide se dá para
 * agendar: sem canal conectado, agendar é encher fila que nunca sai.
 */
@Injectable()
export class GetCustomerSocialChannelsUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly engine: ISocialEngineGateway,
  ) {}

  async execute(
    req: GetCustomerSocialChannelsRequest,
  ): Promise<GetCustomerSocialChannelsResult> {
    const customer = await this.customers.findById(req.customerId)
    if (!customer) return left(new CustomerNotFoundError(req.customerId))

    const groupId = customer.postizGroupId
    // Cliente sem vínculo é estado normal, não erro: responde vazio e a tela
    // mostra o convite para ligar, sem precisar do motor de pé.
    if (!groupId) {
      return right({ linked: false, groupId: null, groupName: null, channels: [] })
    }

    if (!(await this.engine.isConfigured())) {
      return left(new SocialEngineNotConfiguredError())
    }

    const [groups, channels] = await Promise.all([
      this.engine.listGroups(),
      this.engine.listChannels(),
    ])

    return right({
      linked: true,
      groupId,
      groupName: groups.find((g) => g.id === groupId)?.name ?? null,
      channels: channels.filter((c) => c.groupId === groupId),
    })
  }
}
