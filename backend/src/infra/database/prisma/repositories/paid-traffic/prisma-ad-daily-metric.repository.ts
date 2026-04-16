import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import {
  IAdDailyMetricRepository,
  AdDailyMetricData,
  DateRange,
} from '@/domain/paid-traffic/application/repositories/i-ad-daily-metric.repository'
import { PrismaService } from '../../prisma.service'

@Injectable()
export class PrismaAdDailyMetricRepository implements IAdDailyMetricRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAdId(adId: string): Promise<AdDailyMetricData[]> {
    const raws = await this.prisma.adDailyMetric.findMany({
      where: { adId },
      orderBy: { date: 'asc' },
    })
    return raws.map(this.toData)
  }

  async findByCampaignId(campaignId: string, dateRange?: DateRange): Promise<AdDailyMetricData[]> {
    const where: Prisma.AdDailyMetricWhereInput = {
      campaignId,
      ...(dateRange
        ? { date: { gte: dateRange.since, lte: dateRange.until } }
        : {}),
    }

    const raws = await this.prisma.adDailyMetric.findMany({
      where,
      orderBy: { date: 'asc' },
    })

    return raws.map(this.toData)
  }

  async upsert(metric: AdDailyMetricData): Promise<void> {
    const data = {
      adId: metric.adId,
      campaignId: metric.campaignId,
      date: metric.date,
      impressions: metric.impressions,
      clicks: metric.clicks,
      reach: metric.reach,
      spent: metric.spent,
      conversions: metric.conversions,
      results: metric.results,
      ctr: metric.ctr ?? null,
      cpc: metric.cpc ?? null,
      cpm: metric.cpm ?? null,
      cpp: metric.cpp ?? null,
      roas: metric.roas ?? null,
      frequency: metric.frequency ?? null,
    }

    await this.prisma.adDailyMetric.upsert({
      where: { adId_date: { adId: metric.adId, date: metric.date } },
      create: data,
      update: data,
    })
  }

  private toData(raw: {
    id: string
    adId: string
    campaignId: string
    date: Date
    impressions: number
    clicks: number
    reach: number
    spent: number
    conversions: number
    results: number
    ctr: number | null
    cpc: number | null
    cpm: number | null
    cpp: number | null
    roas: number | null
    frequency: number | null
  }): AdDailyMetricData {
    return {
      id: raw.id,
      adId: raw.adId,
      campaignId: raw.campaignId,
      date: raw.date,
      impressions: raw.impressions,
      clicks: raw.clicks,
      reach: raw.reach,
      spent: raw.spent,
      conversions: raw.conversions,
      results: raw.results,
      ctr: raw.ctr,
      cpc: raw.cpc,
      cpm: raw.cpm,
      cpp: raw.cpp,
      roas: raw.roas,
      frequency: raw.frequency,
    }
  }
}
