import {
  ICustomerActivityRepository,
  FindCustomerActivitiesParams,
  PaginatedActivities,
} from '@/domain/customers/application/repositories/i-customer-activity.repository'
import { CustomerActivity } from '@/domain/customers/enterprise/entities/customer-activity'

export class InMemoryCustomerActivityRepository
  implements ICustomerActivityRepository
{
  public items: CustomerActivity[] = []

  async findByCustomerId(
    customerId: string,
    params?: FindCustomerActivitiesParams,
  ): Promise<PaginatedActivities> {
    const filtered = this.items.filter((a) => a.customerId === customerId)
    const total = filtered.length
    const page = params?.page ?? 1
    const limit = params?.limit ?? 20
    const items = filtered.slice((page - 1) * limit, page * limit)
    return { items, total }
  }

  async save(activity: CustomerActivity): Promise<void> {
    this.items.push(activity)
  }
}
