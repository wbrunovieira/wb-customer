import { randomUUID } from 'crypto'
import {
  ISocialPublicationRepository,
  SocialPublicationRecord,
  StoredSocialPublication,
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
}
