import { AdSet } from '../../enterprise/entities/ad-set'

export abstract class IAdSetRepository {
  abstract findById(id: string): Promise<AdSet | null>
  abstract findByCampaignId(campaignId: string): Promise<AdSet[]>
  abstract save(adSet: AdSet): Promise<void>
  abstract delete(id: string): Promise<void>
}
