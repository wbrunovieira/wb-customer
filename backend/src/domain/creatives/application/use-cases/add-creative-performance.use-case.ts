import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICreativeRepository } from '../repositories/i-creative.repository'
import { ICreativePerformanceRepository } from '../repositories/i-creative-performance.repository'
import { CreativeNotFoundError } from '../../domain/exceptions/creative-not-found.error'

export interface AddCreativePerformanceRequest {
  customerId: string
  creativeId: string
  platform: string
  campaignId?: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
  ctr?: number
  cpc?: number
  cpa?: number
  roas?: number
  startDate: Date
  endDate?: Date
  notes?: string
}

export interface AddCreativePerformanceResponse {
  performanceId: string
}

export type AddCreativePerformanceResult = Either<CreativeNotFoundError, AddCreativePerformanceResponse>

@Injectable()
export class AddCreativePerformanceUseCase {
  constructor(
    private readonly creativeRepo: ICreativeRepository,
    private readonly performanceRepo: ICreativePerformanceRepository,
  ) {}

  async execute(req: AddCreativePerformanceRequest): Promise<AddCreativePerformanceResult> {
    const creative = await this.creativeRepo.findById(req.creativeId)

    if (!creative || creative.customerId !== req.customerId || creative.isDeleted) {
      return left(new CreativeNotFoundError(req.creativeId))
    }

    const performanceId = await this.performanceRepo.create({
      creativeId: req.creativeId,
      platform: req.platform,
      campaignId: req.campaignId ?? null,
      impressions: req.impressions,
      clicks: req.clicks,
      conversions: req.conversions,
      spend: req.spend,
      ctr: req.ctr ?? null,
      cpc: req.cpc ?? null,
      cpa: req.cpa ?? null,
      roas: req.roas ?? null,
      startDate: req.startDate,
      endDate: req.endDate ?? null,
      notes: req.notes ?? null,
    })

    return right({ performanceId })
  }
}
