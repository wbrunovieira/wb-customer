import {
  ISocialPostMetricRepository,
  SocialPostMetricRecord,
} from '../../repositories/i-social-post-metric.repository'

export class InMemorySocialPostMetricRepository implements ISocialPostMetricRepository {
  public items: SocialPostMetricRecord[] = []

  async upsert(record: SocialPostMetricRecord): Promise<void> {
    const idx = this.items.findIndex((m) => m.postizPostId === record.postizPostId)
    if (idx >= 0) this.items[idx] = record
    else this.items.push(record)
  }

  async findByPostizPostId(postId: string): Promise<SocialPostMetricRecord | null> {
    return this.items.find((m) => m.postizPostId === postId) ?? null
  }

  async findByCustomerId(customerId: string): Promise<SocialPostMetricRecord[]> {
    return this.items.filter((m) => m.customerId === customerId)
  }
}
