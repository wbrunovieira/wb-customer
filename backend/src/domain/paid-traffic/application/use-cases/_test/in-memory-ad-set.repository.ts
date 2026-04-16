import { IAdSetRepository } from '../../repositories/i-ad-set.repository'
import { AdSet } from '../../../enterprise/entities/ad-set'

export class InMemoryAdSetRepository implements IAdSetRepository {
  public items: AdSet[] = []

  async findById(id: string): Promise<AdSet | null> {
    return this.items.find((a) => a.id.value === id) ?? null
  }

  async findByCampaignId(campaignId: string): Promise<AdSet[]> {
    return this.items.filter((a) => a.campaignId === campaignId)
  }

  async save(adSet: AdSet): Promise<void> {
    const idx = this.items.findIndex((a) => a.id.value === adSet.id.value)
    if (idx >= 0) {
      this.items[idx] = adSet
    } else {
      this.items.push(adSet)
    }
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((a) => a.id.value !== id)
  }
}
