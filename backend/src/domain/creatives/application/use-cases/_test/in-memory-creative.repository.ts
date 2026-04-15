import {
  ICreativeRepository,
  FindManyCreativesParams,
  PaginatedCreatives,
} from '../../../application/repositories/i-creative.repository'
import { Creative } from '../../../enterprise/entities/creative'

export class InMemoryCreativeRepository implements ICreativeRepository {
  public items: Creative[] = []

  async findById(id: string): Promise<Creative | null> {
    return this.items.find((c) => c.id.value === id) ?? null
  }

  async findByCustomerId(
    customerId: string,
    params: FindManyCreativesParams = {},
  ): Promise<PaginatedCreatives> {
    const { type, status, page = 1, limit = 20 } = params

    let filtered = this.items.filter(
      (c) => c.customerId === customerId && !c.isDeleted,
    )

    if (type) filtered = filtered.filter((c) => c.type === type)
    if (status) filtered = filtered.filter((c) => c.status === status)

    const total = filtered.length
    const items = filtered.slice((page - 1) * limit, page * limit)

    return { items, total }
  }

  async save(creative: Creative): Promise<void> {
    const idx = this.items.findIndex((c) => c.id.value === creative.id.value)
    if (idx >= 0) {
      this.items[idx] = creative
    } else {
      this.items.push(creative)
    }
  }

  async softDelete(id: string): Promise<void> {
    const creative = this.items.find((c) => c.id.value === id)
    creative?.softDelete()
  }
}
