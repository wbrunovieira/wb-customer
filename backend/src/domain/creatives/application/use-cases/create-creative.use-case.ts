import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICreativeRepository } from '../repositories/i-creative.repository'
import { Creative, CREATIVE_TYPES, CAMPAIGN_OBJECTIVES, CreativeType, CampaignObjective } from '../../enterprise/entities/creative'
import { CreativeNotFoundError } from '../../domain/exceptions/creative-not-found.error'

export interface CreateCreativeRequest {
  customerId: string
  title: string
  caption?: string
  designDescription?: string
  type: string
  objective?: string
  createdByUserId: string
}

export interface CreateCreativeResponse {
  creativeId: string
}

type CustomerRepo = { findById(id: string): Promise<{ id: { value: string } } | null> }

export type CreateCreativeResult = Either<Error, CreateCreativeResponse>

@Injectable()
export class CreateCreativeUseCase {
  constructor(
    private readonly creativeRepo: ICreativeRepository,
    private readonly customerRepo: CustomerRepo,
  ) {}

  async execute(req: CreateCreativeRequest): Promise<CreateCreativeResult> {
    const customer = await this.customerRepo.findById(req.customerId)
    if (!customer) {
      return left(new CreativeNotFoundError(req.customerId))
    }

    if (!CREATIVE_TYPES.includes(req.type as CreativeType)) {
      return left(new Error(`Invalid creative type: "${req.type}"`))
    }

    if (req.objective && !CAMPAIGN_OBJECTIVES.includes(req.objective as CampaignObjective)) {
      return left(new Error(`Invalid objective: "${req.objective}"`))
    }

    const creative = Creative.create({
      customerId: req.customerId,
      title: req.title,
      caption: req.caption ?? null,
      designDescription: req.designDescription ?? null,
      type: req.type as CreativeType,
      objective: (req.objective as CampaignObjective) ?? null,
      createdByUserId: req.createdByUserId,
    })

    await this.creativeRepo.save(creative)

    return right({ creativeId: creative.id.value })
  }
}
