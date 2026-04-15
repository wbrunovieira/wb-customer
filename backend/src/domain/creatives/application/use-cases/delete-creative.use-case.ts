import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICreativeRepository } from '../repositories/i-creative.repository'
import { CreativeNotFoundError } from '../../domain/exceptions/creative-not-found.error'

export interface DeleteCreativeRequest {
  customerId: string
  creativeId: string
}

export type DeleteCreativeResult = Either<CreativeNotFoundError, void>

@Injectable()
export class DeleteCreativeUseCase {
  constructor(private readonly repo: ICreativeRepository) {}

  async execute(req: DeleteCreativeRequest): Promise<DeleteCreativeResult> {
    const creative = await this.repo.findById(req.creativeId)

    if (!creative || creative.customerId !== req.customerId || creative.isDeleted) {
      return left(new CreativeNotFoundError(req.creativeId))
    }

    creative.softDelete()
    await this.repo.save(creative)

    return right(undefined)
  }
}
