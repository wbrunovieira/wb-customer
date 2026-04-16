import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICreativeRepository } from '../repositories/i-creative.repository'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { Creative, CREATIVE_TYPES, CREATIVE_STAGES, CAMPAIGN_OBJECTIVES, CreativeType, CreativeStage, CampaignObjective } from '../../enterprise/entities/creative'
import { CreativeNotFoundError } from '../../domain/exceptions/creative-not-found.error'

export interface CreateCreativeRequest {
  customerId: string
  title: string
  caption?: string
  textInCreative?: string
  designDescription?: string
  type: string
  stage?: string
  parentCreativeId?: string
  variationAspects?: string[]
  objective?: string
  createdByUserId: string
}

export interface CreateCreativeResponse {
  creativeId: string
}

export type CreateCreativeResult = Either<Error, CreateCreativeResponse>

@Injectable()
export class CreateCreativeUseCase {
  constructor(
    private readonly creativeRepo: ICreativeRepository,
    private readonly customerRepo: ICustomerRepository,
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

    if (req.stage && !CREATIVE_STAGES.includes(req.stage as CreativeStage)) {
      return left(new Error(`Invalid stage: "${req.stage}"`))
    }

    const creative = Creative.create({
      customerId: req.customerId,
      title: req.title,
      caption: req.caption ?? null,
      textInCreative: req.textInCreative ?? null,
      designDescription: req.designDescription ?? null,
      type: req.type as CreativeType,
      stage: (req.stage as CreativeStage) ?? null,
      parentCreativeId: req.parentCreativeId ?? null,
      variationAspects: req.variationAspects ?? [],
      objective: (req.objective as CampaignObjective) ?? null,
      createdByUserId: req.createdByUserId,
    })

    await this.creativeRepo.save(creative)

    return right({ creativeId: creative.id.value })
  }
}
