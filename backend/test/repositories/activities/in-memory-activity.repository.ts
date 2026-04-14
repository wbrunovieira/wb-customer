import { IActivityRepository, FindManyActivitiesParams, PaginatedActivities } from '@/domain/activities/application/repositories/i-activity.repository'
import { Activity } from '@/domain/activities/enterprise/entities/activity'

export class InMemoryActivityRepository implements IActivityRepository {
  items: Activity[] = []

  async findById(id: string): Promise<Activity | null> {
    return this.items.find((a) => a.id.value === id && !a.deletedAt) ?? null
  }

  async findByCustomerId(customerId: string, params: FindManyActivitiesParams): Promise<PaginatedActivities> {
    let filtered = this.items.filter(
      (a) => a.customerId === customerId && !a.deletedAt,
    )
    if (params.type) filtered = filtered.filter((a) => a.type === params.type)
    if (params.status) filtered = filtered.filter((a) => a.status === params.status)
    if (params.from) filtered = filtered.filter((a) => a.createdAt >= params.from!)
    if (params.to) filtered = filtered.filter((a) => a.createdAt <= params.to!)
    const page = params.page ?? 1
    const limit = params.limit ?? 50
    const total = filtered.length
    const items = filtered.slice((page - 1) * limit, page * limit)
    return { items, total }
  }

  async save(activity: Activity): Promise<void> {
    const idx = this.items.findIndex((a) => a.id.value === activity.id.value)
    if (idx >= 0) this.items[idx] = activity
    else this.items.push(activity)
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((a) => a.id.value !== id)
  }
}
