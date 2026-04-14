import { Activity } from '../../enterprise/entities/activity'

export interface FindManyActivitiesParams {
  type?: string
  status?: string
  from?: Date
  to?: Date
  page?: number
  limit?: number
}

export interface PaginatedActivities {
  items: Activity[]
  total: number
}

export abstract class IActivityRepository {
  abstract findById(id: string): Promise<Activity | null>
  abstract findByCustomerId(customerId: string, params: FindManyActivitiesParams): Promise<PaginatedActivities>
  abstract save(activity: Activity): Promise<void>
  abstract delete(id: string): Promise<void>
}
