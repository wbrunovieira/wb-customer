import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IAdSetRepository } from '../repositories/i-ad-set.repository'

export interface DeleteAdSetRequest {
  adSetId: string
}

export interface DeleteAdSetResponse {
  success: true
}

export type DeleteAdSetResult = Either<Error, DeleteAdSetResponse>

@Injectable()
export class DeleteAdSetUseCase {
  constructor(private readonly adSetRepo: IAdSetRepository) {}

  async execute(req: DeleteAdSetRequest): Promise<DeleteAdSetResult> {
    const adSet = await this.adSetRepo.findById(req.adSetId)
    if (!adSet) {
      return left(new Error(`Ad set not found: ${req.adSetId}`))
    }

    await this.adSetRepo.delete(req.adSetId)

    return right({ success: true })
  }
}
