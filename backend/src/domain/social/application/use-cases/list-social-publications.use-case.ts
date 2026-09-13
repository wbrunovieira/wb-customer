import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import {
  ISocialPublicationRepository,
  StoredSocialPublication,
} from '../repositories/i-social-publication.repository'

export interface ListSocialPublicationsRequest {
  customerId: string
}

export interface ListSocialPublicationsResponse {
  publications: StoredSocialPublication[]
}

export type ListSocialPublicationsResult = Either<
  CustomerNotFoundError,
  ListSocialPublicationsResponse
>

/**
 * O que este cliente mandou publicar, do lado de cá.
 *
 * Não substitui a fila do motor: aqui está a decisão tomada e o id de post que
 * liga uma coisa à outra. É o caminho de volta quando a métrica chega falando
 * em id de post e ninguém sabe de que publicação ela veio.
 */
@Injectable()
export class ListSocialPublicationsUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly publications: ISocialPublicationRepository,
  ) {}

  async execute(
    req: ListSocialPublicationsRequest,
  ): Promise<ListSocialPublicationsResult> {
    const customer = await this.customers.findById(req.customerId)
    if (!customer) return left(new CustomerNotFoundError(req.customerId))

    return right({
      publications: await this.publications.findByCustomerId(req.customerId),
    })
  }
}
