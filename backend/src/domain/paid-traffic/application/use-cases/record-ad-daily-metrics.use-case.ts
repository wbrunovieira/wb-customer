import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { IAdDailyMetricRepository } from '../repositories/i-ad-daily-metric.repository'

export interface RecordAdDailyMetricsRequest {
  adId: string
  campaignId: string
  date: Date
  impressions: number
  clicks: number
  reach: number
  spent: number
  conversions: number
  results: number
  ctr?: number | null
  cpc?: number | null
  cpm?: number | null
  cpp?: number | null
  roas?: number | null
  frequency?: number | null
}

export interface RecordAdDailyMetricsResponse {
  success: true
}

export type RecordAdDailyMetricsResult = Either<Error, RecordAdDailyMetricsResponse>

@Injectable()
export class RecordAdDailyMetricsUseCase {
  constructor(private readonly metricRepo: IAdDailyMetricRepository) {}

  async execute(req: RecordAdDailyMetricsRequest): Promise<RecordAdDailyMetricsResult> {
    await this.metricRepo.upsert({
      adId: req.adId,
      campaignId: req.campaignId,
      date: req.date,
      impressions: req.impressions,
      clicks: req.clicks,
      reach: req.reach,
      spent: req.spent,
      conversions: req.conversions,
      results: req.results,
      ctr: req.ctr ?? null,
      cpc: req.cpc ?? null,
      cpm: req.cpm ?? null,
      cpp: req.cpp ?? null,
      roas: req.roas ?? null,
      frequency: req.frequency ?? null,
    })

    return right({ success: true })
  }
}
