import { randomUUID } from 'crypto'
import {
  ISocialPublicationRepository,
  ReconcilableTarget,
  SocialPublicationRecord,
  StoredSocialPublication,
  UpdateTargetStateInput,
} from '../../repositories/i-social-publication.repository'

export class InMemorySocialPublicationRepository
  implements ISocialPublicationRepository
{
  public items: StoredSocialPublication[] = []

  async create(record: SocialPublicationRecord): Promise<string> {
    const id = record.id ?? randomUUID()
    this.items.push({ ...record, id, createdAt: record.createdAt ?? new Date() })
    return id
  }

  async findByCustomerId(customerId: string): Promise<StoredSocialPublication[]> {
    return this.items.filter((p) => p.customerId === customerId)
  }

  async findByPostizPostId(postId: string): Promise<StoredSocialPublication | null> {
    return (
      this.items.find((p) => p.targets.some((t) => t.postizPostId === postId)) ?? null
    )
  }

  async findTargetsToReconcile(limit = 200): Promise<ReconcilableTarget[]> {
    return this.items
      .flatMap((p) =>
        p.targets
          .filter((t) => !['PUBLISHED', 'ERROR'].includes(t.state ?? 'QUEUE'))
          .map((t) => ({
            publicationId: p.id,
            customerId: p.customerId,
            postizGroupId: p.postizGroupId,
            postizPostId: t.postizPostId,
            channelId: t.channelId,
            provider: t.provider,
            state: t.state ?? 'QUEUE',
            scheduledFor: p.scheduledFor,
          })),
      )
      .slice(0, limit)
  }

  async updateTargetState(input: UpdateTargetStateInput): Promise<void> {
    for (const publication of this.items) {
      for (const target of publication.targets) {
        if (target.postizPostId !== input.postizPostId) continue
        target.state = input.state
        target.failureReason = input.failureReason ?? null
        target.publishedUrl = input.publishedUrl ?? null
        target.lastCheckedAt = input.checkedAt
      }
    }
  }

  async findPublishedTargetsSince(since: Date, limit = 60): Promise<ReconcilableTarget[]> {
    return this.items
      .filter((p) => p.scheduledFor >= since)
      .flatMap((p) =>
        p.targets
          .filter((t) => t.state === 'PUBLISHED')
          .map((t) => ({
            publicationId: p.id,
            customerId: p.customerId,
            postizGroupId: p.postizGroupId,
            postizPostId: t.postizPostId,
            channelId: t.channelId,
            provider: t.provider,
            state: t.state ?? 'PUBLISHED',
            scheduledFor: p.scheduledFor,
          })),
      )
      .slice(0, limit)
  }
}
