import { Injectable } from '@nestjs/common'
import {
  ICreativePerformanceRepository,
  CreativePerformanceRecord,
  SyncedCreativePerformanceRecord,
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
        source: record.source ?? 'manual',
      },
    })
    return created.id
  }

  async upsertSynced(record: SyncedCreativePerformanceRecord): Promise<string> {
    const values = {
      platform: record.platform,
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
    }

    const saved = await this.prisma.creativePerformance.upsert({
      where: {
        creativeId_campaignId_source: {
          creativeId: record.creativeId,
          campaignId: record.campaignId,
          source: record.source,
        },
      },
      create: {
        creativeId: record.creativeId,
        campaignId: record.campaignId,
        source: record.source,
        ...values,
      },
      update: { ...values, recordedAt: new Date() },
    })

    return saved.id
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
      source: r.source,
    }))
  }
}
