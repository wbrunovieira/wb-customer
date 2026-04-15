import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICreativeRepository } from '../repositories/i-creative.repository'
import { ICreativePerformanceRepository } from '../repositories/i-creative-performance.repository'
import { CreativeNotFoundError } from '../../domain/exceptions/creative-not-found.error'

export interface GetCreativePerformanceSummaryRequest {
  customerId: string
  creativeId: string
}

export interface PerformanceSummary {
  recordCount: number
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  totalSpend: number
  avgCtr: number | null
  avgCpc: number | null
  avgCpa: number | null
  avgRoas: number | null
  platforms: string[]
}

export type GetCreativePerformanceSummaryResult = Either<
  CreativeNotFoundError,
  { summary: PerformanceSummary }
>

@Injectable()
export class GetCreativePerformanceSummaryUseCase {
  constructor(
    private readonly creativeRepo: ICreativeRepository,
    private readonly performanceRepo: ICreativePerformanceRepository,
  ) {}

  async execute(
    req: GetCreativePerformanceSummaryRequest,
  ): Promise<GetCreativePerformanceSummaryResult> {
    const creative = await this.creativeRepo.findById(req.creativeId)

    if (!creative || creative.customerId !== req.customerId || creative.isDeleted) {
      return left(new CreativeNotFoundError(req.creativeId))
    }

    const records = await this.performanceRepo.findByCreativeId(req.creativeId)

    const totalImpressions = records.reduce((s, r) => s + r.impressions, 0)
    const totalClicks = records.reduce((s, r) => s + r.clicks, 0)
    const totalConversions = records.reduce((s, r) => s + r.conversions, 0)
    const totalSpend = records.reduce((s, r) => s + r.spend, 0)

    const avg = (vals: number[]): number | null =>
      vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null

    const avgCtr = avg(records.map(r => r.ctr).filter((v): v is number => v != null))
    const avgCpc = avg(records.map(r => r.cpc).filter((v): v is number => v != null))
    const avgCpa = avg(records.map(r => r.cpa).filter((v): v is number => v != null))
    const avgRoas = avg(records.map(r => r.roas).filter((v): v is number => v != null))

    const platforms = [...new Set(records.map(r => r.platform))]

    return right({
      summary: {
        recordCount: records.length,
        totalImpressions,
        totalClicks,
        totalConversions,
        totalSpend,
        avgCtr,
        avgCpc,
        avgCpa,
        avgRoas,
        platforms,
      },
    })
  }
}
