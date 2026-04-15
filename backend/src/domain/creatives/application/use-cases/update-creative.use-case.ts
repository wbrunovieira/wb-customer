import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICreativeRepository } from '../repositories/i-creative.repository'
import { CampaignObjective, CreativeStatus } from '../../enterprise/entities/creative'
import { CreativeNotFoundError } from '../../domain/exceptions/creative-not-found.error'

export interface UpdateCreativeRequest {
  customerId: string
  creativeId: string
  title?: string
  caption?: string | null
  textInCreative?: string | null
  designDescription?: string | null
  objective?: string | null
  status?: string
}

export type UpdateCreativeResult = Either<CreativeNotFoundError, void>

@Injectable()
export class UpdateCreativeUseCase {
  constructor(private readonly repo: ICreativeRepository) {}

  async execute(req: UpdateCreativeRequest): Promise<UpdateCreativeResult> {
    const creative = await this.repo.findById(req.creativeId)

    if (!creative || creative.customerId !== req.customerId || creative.isDeleted) {
      return left(new CreativeNotFoundError(req.creativeId))
    }

    creative.updateDetails({
      title: req.title,
      caption: req.caption,
      textInCreative: req.textInCreative,
      designDescription: req.designDescription,
      objective: req.objective !== undefined ? (req.objective as CampaignObjective | null) : undefined,
    })

    if (req.status !== undefined) {
      creative.changeStatus(req.status as CreativeStatus)
    }

    await this.repo.save(creative)

    return right(undefined)
  }
}
