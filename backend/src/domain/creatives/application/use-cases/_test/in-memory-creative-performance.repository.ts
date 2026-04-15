import { randomUUID } from 'crypto'
import {
  ICreativePerformanceRepository,
  CreativePerformanceRecord,
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
}
