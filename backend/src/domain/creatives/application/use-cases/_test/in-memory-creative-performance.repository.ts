import { randomUUID } from 'crypto'
import {
  ICreativePerformanceRepository,
  CreativePerformanceRecord,
  SyncedCreativePerformanceRecord,
} from '../../../application/repositories/i-creative-performance.repository'

export class InMemoryCreativePerformanceRepository implements ICreativePerformanceRepository {
  public items: (CreativePerformanceRecord & { id: string })[] = []

  async create(record: CreativePerformanceRecord): Promise<string> {
    const id = record.id ?? randomUUID()
    this.items.push({ ...record, id })
    return id
  }

  async findByCreativeId(creativeId: string): Promise<CreativePerformanceRecord[]> {
    return this.items.filter((r) => r.creativeId === creativeId)
  }

  async upsertSynced(record: SyncedCreativePerformanceRecord): Promise<string> {
    const idx = this.items.findIndex(
      (r) =>
        r.creativeId === record.creativeId &&
        r.campaignId === record.campaignId &&
        r.source === record.source,
    )

    if (idx >= 0) {
      this.items[idx] = { ...this.items[idx], ...record }
      return this.items[idx].id
    }

    const id = record.id ?? randomUUID()
    this.items.push({ ...record, id })
    return id
  }
}
