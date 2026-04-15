import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICreativeRepository } from '../repositories/i-creative.repository'
import { Creative } from '../../enterprise/entities/creative'
import { CreativeNotFoundError } from '../../domain/exceptions/creative-not-found.error'

export interface GetCreativeRequest {
  customerId: string
  creativeId: string
}

export interface GetCreativeResponse {
  creative: Creative
}

export type GetCreativeResult = Either<CreativeNotFoundError, GetCreativeResponse>

@Injectable()
export class GetCreativeUseCase {
  constructor(private readonly repo: ICreativeRepository) {}

  async execute(req: GetCreativeRequest): Promise<GetCreativeResult> {
    const creative = await this.repo.findById(req.creativeId)

    if (!creative || creative.customerId !== req.customerId || creative.isDeleted) {
      return left(new CreativeNotFoundError(req.creativeId))
    }

    return right({ creative })
  }
}
