import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IAdRepository } from '../repositories/i-ad.repository'

export interface DeleteAdRequest {
  adId: string
}

export interface DeleteAdResponse {
  success: true
}

export type DeleteAdResult = Either<Error, DeleteAdResponse>

@Injectable()
export class DeleteAdUseCase {
  constructor(private readonly adRepo: IAdRepository) {}

  async execute(req: DeleteAdRequest): Promise<DeleteAdResult> {
    const ad = await this.adRepo.findById(req.adId)
    if (!ad) {
      return left(new Error(`Ad not found: ${req.adId}`))
    }

    await this.adRepo.delete(req.adId)

    return right({ success: true })
  }
}
