import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import {
  ISocialPostMetricRepository,
  SocialPostMetricRecord,
} from '../repositories/i-social-post-metric.repository'

export interface ListSocialPostMetricsRequest {
  customerId: string
}

export interface ListSocialPostMetricsResponse {
  metrics: SocialPostMetricRecord[]
}

export type ListSocialPostMetricsResult = Either<
  CustomerNotFoundError,
  ListSocialPostMetricsResponse
>

/**
 * Os números já guardados deste cliente.
 *
 * Lê do nosso banco, não do motor: é isso que permite montar comparação e série
 * sem gastar as 90 requisições por hora que o motor concede.
 */
@Injectable()
export class ListSocialPostMetricsUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly metrics: ISocialPostMetricRepository,
  ) {}

  async execute(
    req: ListSocialPostMetricsRequest,
  ): Promise<ListSocialPostMetricsResult> {
    const customer = await this.customers.findById(req.customerId)
    if (!customer) return left(new CustomerNotFoundError(req.customerId))

    return right({ metrics: await this.metrics.findByCustomerId(req.customerId) })
  }
}
