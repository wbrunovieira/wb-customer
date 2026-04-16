import { Ad } from '../../enterprise/entities/ad'

export abstract class IAdRepository {
  abstract findById(id: string): Promise<Ad | null>
  abstract findByAdSetId(adSetId: string): Promise<Ad[]>
  abstract save(ad: Ad): Promise<void>
  abstract delete(id: string): Promise<void>
}
