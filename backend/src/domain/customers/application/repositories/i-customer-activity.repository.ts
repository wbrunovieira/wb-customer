import { CustomerActivity } from '../../enterprise/entities/customer-activity'

export interface FindCustomerActivitiesParams {
  page?: number
  limit?: number
}

export interface PaginatedActivities {
  items: CustomerActivity[]
  total: number
}

export abstract class ICustomerActivityRepository {
  abstract findByCustomerId(
    customerId: string,
    params?: FindCustomerActivitiesParams,
  ): Promise<PaginatedActivities>
  abstract save(activity: CustomerActivity): Promise<void>
}
