import {
  ICampaignRepository,
  FindManyCampaignsParams,
  PaginatedCampaigns,
} from '../../repositories/i-campaign.repository'
import { Campaign } from '../../../enterprise/entities/campaign'

export class InMemoryCampaignRepository implements ICampaignRepository {
  public items: Campaign[] = []

  async findById(id: string): Promise<Campaign | null> {
    return this.items.find((c) => c.id.value === id) ?? null
  }

  async findByCustomerId(
    customerId: string,
    params: FindManyCampaignsParams = {},
  ): Promise<PaginatedCampaigns> {
    const { status, publishStatus, page = 1, limit = 20 } = params

    let filtered = this.items.filter((c) => c.customerId === customerId)
    if (status) filtered = filtered.filter((c) => c.status === status)
    if (publishStatus) filtered = filtered.filter((c) => c.publishStatus === publishStatus)

    const total = filtered.length
    const items = filtered.slice((page - 1) * limit, page * limit)

    return { items, total }
  }

  async save(campaign: Campaign): Promise<void> {
    const idx = this.items.findIndex((c) => c.id.value === campaign.id.value)
    if (idx >= 0) {
      this.items[idx] = campaign
    } else {
      this.items.push(campaign)
    }
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((c) => c.id.value !== id)
  }
}
