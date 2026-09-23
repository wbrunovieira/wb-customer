import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { ISocialEngineGateway } from '../gateways/i-social-engine.gateway'
import { SocialEngineNotConfiguredError } from '../../domain/exceptions/social-engine-not-configured.error'

export interface SocialGroupView {
  id: string
  name: string
  /** Quantos canais já foram conectados a este grupo. */
  channels: number
  /** Cliente do wb-customer que já usa este grupo, quando há. */
  linkedCustomerId: string | null
  linkedCustomerName: string | null
}

export interface ListSocialGroupsResponse {
  groups: SocialGroupView[]
}

export type ListSocialGroupsResult = Either<
  SocialEngineNotConfiguredError,
  ListSocialGroupsResponse
>

/**
 * Lista os grupos do motor com o vínculo já resolvido, que é o que a tela de
 * ligação precisa mostrar: um grupo sem cliente é candidato, um grupo com
 * cliente é ocupado. Sem isso o operador liga o mesmo grupo duas vezes e só
 * descobre quando o post do cliente errado sai publicado.
 */
@Injectable()
export class ListSocialGroupsUseCase {
  constructor(
    private readonly engine: ISocialEngineGateway,
    private readonly customers: ICustomerRepository,
  ) {}

  async execute(): Promise<ListSocialGroupsResult> {
    if (!(await this.engine.isConfigured())) {
      return left(new SocialEngineNotConfiguredError())
    }

    const [groups, channels] = await Promise.all([
      this.engine.listGroups(),
      this.engine.listChannels(),
    ])

    const groupViews = await Promise.all(
      groups.map(async (group) => {
        const owner = await this.customers.findByPostizGroupId(group.id)

        return {
          id: group.id,
          name: group.name,
          channels: channels.filter((c) => c.groupId === group.id).length,
          linkedCustomerId: owner?.id.value ?? null,
          linkedCustomerName: owner?.name ?? null,
        }
      }),
    )

    return right({ groups: groupViews })
  }
}
