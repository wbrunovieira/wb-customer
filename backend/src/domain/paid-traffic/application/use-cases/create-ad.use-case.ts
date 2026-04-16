import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IAdRepository } from '../repositories/i-ad.repository'
import { IAdSetRepository } from '../repositories/i-ad-set.repository'
import { Ad, AdCallToAction } from '../../enterprise/entities/ad'

export interface CreateAdRequest {
  adSetId: string
  name: string
  creativeId?: string | null
  primaryText?: string | null
  headline?: string | null
  description?: string | null
  callToAction?: AdCallToAction
  destinationUrl?: string | null
}

export interface CreateAdResponse {
  adId: string
}

export type CreateAdResult = Either<Error, CreateAdResponse>

@Injectable()
export class CreateAdUseCase {
  constructor(
    private readonly adRepo: IAdRepository,
    private readonly adSetRepo: IAdSetRepository,
  ) {}

  async execute(req: CreateAdRequest): Promise<CreateAdResult> {
    const adSet = await this.adSetRepo.findById(req.adSetId)
    if (!adSet) {
      return left(new Error(`Ad set not found: ${req.adSetId}`))
    }

    const ad = Ad.create({
      adSetId: req.adSetId,
      name: req.name,
      creativeId: req.creativeId ?? null,
      primaryText: req.primaryText ?? null,
      headline: req.headline ?? null,
      description: req.description ?? null,
      callToAction: req.callToAction ?? 'LEARN_MORE',
      destinationUrl: req.destinationUrl ?? null,
    })

    await this.adRepo.save(ad)

    return right({ adId: ad.id.value })
  }
}
