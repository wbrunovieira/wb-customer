import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IAdRepository } from '../repositories/i-ad.repository'
import { AdCampaignStatus } from '../../enterprise/entities/campaign'
import { AdCallToAction } from '../../enterprise/entities/ad'

export interface UpdateAdRequest {
  adId: string
  name?: string
  status?: AdCampaignStatus
  creativeId?: string | null
  primaryText?: string | null
  headline?: string | null
  description?: string | null
  callToAction?: AdCallToAction
  destinationUrl?: string | null
}

export interface UpdateAdResponse {
  success: true
}

export type UpdateAdResult = Either<Error, UpdateAdResponse>

@Injectable()
export class UpdateAdUseCase {
  constructor(private readonly adRepo: IAdRepository) {}

  async execute(req: UpdateAdRequest): Promise<UpdateAdResult> {
    const ad = await this.adRepo.findById(req.adId)
    if (!ad) {
      return left(new Error(`Ad not found: ${req.adId}`))
    }

    ad.update({
      name: req.name,
      status: req.status,
      creativeId: req.creativeId,
      primaryText: req.primaryText,
      headline: req.headline,
      description: req.description,
      callToAction: req.callToAction,
      destinationUrl: req.destinationUrl,
    })

    await this.adRepo.save(ad)

    return right({ success: true })
  }
}
