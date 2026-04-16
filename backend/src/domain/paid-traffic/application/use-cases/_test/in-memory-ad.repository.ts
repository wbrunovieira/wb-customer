import { IAdRepository } from '../../repositories/i-ad.repository'
import { Ad } from '../../../enterprise/entities/ad'

export class InMemoryAdRepository implements IAdRepository {
  public items: Ad[] = []

  async findById(id: string): Promise<Ad | null> {
    return this.items.find((a) => a.id.value === id) ?? null
  }

  async findByAdSetId(adSetId: string): Promise<Ad[]> {
    return this.items.filter((a) => a.adSetId === adSetId)
  }

  async save(ad: Ad): Promise<void> {
    const idx = this.items.findIndex((a) => a.id.value === ad.id.value)
    if (idx >= 0) {
      this.items[idx] = ad
    } else {
      this.items.push(ad)
    }
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((a) => a.id.value !== id)
  }
}
