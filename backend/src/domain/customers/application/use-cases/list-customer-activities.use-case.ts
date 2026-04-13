import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '../repositories/i-customer.repository'
import { ICustomerActivityRepository, PaginatedActivities } from '../repositories/i-customer-activity.repository'
import { CustomerNotFoundError } from '../../domain/exceptions/customer-not-found.error'

export interface ListCustomerActivitiesRequest {
  customerId: string
  page?: number
  limit?: number
}

export type ListCustomerActivitiesResult = Either<
  CustomerNotFoundError,
  PaginatedActivities
>

@Injectable()
export class ListCustomerActivitiesUseCase {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly activityRepo: ICustomerActivityRepository,
  ) {}

  async execute(
    request: ListCustomerActivitiesRequest,
  ): Promise<ListCustomerActivitiesResult> {
    const customer = await this.customerRepo.findById(request.customerId)
    if (!customer) {
      return left(new CustomerNotFoundError(request.customerId))
    }

    const result = await this.activityRepo.findByCustomerId(request.customerId, {
      page: request.page ?? 1,
      limit: request.limit ?? 20,
    })

    return right(result)
  }
}
