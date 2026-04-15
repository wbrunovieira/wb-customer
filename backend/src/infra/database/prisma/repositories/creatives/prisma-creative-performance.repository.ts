import { Injectable } from '@nestjs/common'
import {
  ICreativePerformanceRepository,
  CreativePerformanceRecord,
} from '@/domain/creatives/application/repositories/i-creative-performance.repository'
import { PrismaService } from '../../prisma.service'

@Injectable()
export class PrismaCreativePerformanceRepository implements ICreativePerformanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(record: CreativePerformanceRecord): Promise<string> {
    const created = await this.prisma.creativePerformance.create({
      data: {
        creativeId: record.creativeId,
        platform: record.platform,
        campaignId: record.campaignId ?? null,
        impressions: record.impressions,
        clicks: record.clicks,
        conversions: record.conversions,
        spend: record.spend,
        ctr: record.ctr ?? null,
        cpc: record.cpc ?? null,
        cpa: record.cpa ?? null,
        roas: record.roas ?? null,
        startDate: record.startDate,
        endDate: record.endDate ?? null,
        notes: record.notes ?? null,
      },
    })
    return created.id
  }

  async findByCreativeId(creativeId: string): Promise<CreativePerformanceRecord[]> {
    const raws = await this.prisma.creativePerformance.findMany({
      where: { creativeId },
      orderBy: { recordedAt: 'desc' },
    })
    return raws.map((r) => ({
      id: r.id,
      creativeId: r.creativeId,
      platform: r.platform,
      campaignId: r.campaignId,
      impressions: r.impressions,
      clicks: r.clicks,
      conversions: r.conversions,
      spend: r.spend,
      ctr: r.ctr,
      cpc: r.cpc,
      cpa: r.cpa,
      roas: r.roas,
      startDate: r.startDate,
      endDate: r.endDate,
      notes: r.notes,
    }))
  }
}
