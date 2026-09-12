import { randomUUID } from 'crypto'
import {
  ISocialAttributionLinkRepository,
  SocialAttributionLinkRecord,
  StoredAttributionLink,
} from '../../repositories/i-social-attribution-link.repository'

export class InMemorySocialAttributionLinkRepository
  implements ISocialAttributionLinkRepository
{
  public items: StoredAttributionLink[] = []

  async create(record: SocialAttributionLinkRecord): Promise<string> {
    const id = record.id ?? randomUUID()
    this.items.push({ ...record, id, createdAt: record.createdAt ?? new Date() })
    return id
  }

  async findByCode(code: string): Promise<StoredAttributionLink | null> {
    return this.items.find((l) => l.code === code) ?? null
  }

  async findByCustomerId(customerId: string): Promise<StoredAttributionLink[]> {
    return this.items.filter((l) => l.customerId === customerId)
  }
}
