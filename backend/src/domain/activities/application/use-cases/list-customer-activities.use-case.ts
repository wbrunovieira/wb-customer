import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { IActivityRepository, FindManyActivitiesParams, PaginatedActivities } from '../repositories/i-activity.repository'

export interface ListCustomerActivitiesRequest extends FindManyActivitiesParams {
  customerId: string
}

export type ListCustomerActivitiesResult = Either<never, PaginatedActivities>

@Injectable()
export class ListCustomerActivitiesUseCase {
  constructor(private readonly repo: IActivityRepository) {}

  async execute(req: ListCustomerActivitiesRequest): Promise<ListCustomerActivitiesResult> {
    const { customerId, ...params } = req
    const result = await this.repo.findByCustomerId(customerId, params)
    return right(result)
  }
}
