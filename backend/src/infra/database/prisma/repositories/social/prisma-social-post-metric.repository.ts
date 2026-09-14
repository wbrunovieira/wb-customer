import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import {
  ISocialPostMetricRepository,
  SocialPostMetricRecord,
} from '@/domain/social/application/repositories/i-social-post-metric.repository'
import { PrismaService } from '../../prisma.service'

type RawMetric = {
  postizPostId: string
  customerId: string
  provider: string
  views: number | null
  reach: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  raw: Prisma.JsonValue
  collectedAt: Date
}

@Injectable()
export class PrismaSocialPostMetricRepository implements ISocialPostMetricRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(record: SocialPostMetricRecord): Promise<void> {
    const data = {
      customerId: record.customerId,
      provider: record.provider,
      views: record.views ?? null,
      reach: record.reach ?? null,
      likes: record.likes ?? null,
      comments: record.comments ?? null,
      shares: record.shares ?? null,
      saves: record.saves ?? null,
      raw: (record.raw ?? []) as Prisma.InputJsonValue,
      collectedAt: record.collectedAt,
    }

    // Por postizPostId: coletar de novo atualiza o número, não cria linha nova.
    // Uma métrica que muda ao longo dos dias tem um valor corrente, não um
    // histórico de leituras.
    await this.prisma.socialPostMetric.upsert({
      where: { postizPostId: record.postizPostId },
      create: { postizPostId: record.postizPostId, ...data },
      update: data,
    })
  }

  async findByPostizPostId(postId: string): Promise<SocialPostMetricRecord | null> {
    const raw = await this.prisma.socialPostMetric.findUnique({
      where: { postizPostId: postId },
    })
    return raw ? this.toRecord(raw) : null
  }

  async findByCustomerId(customerId: string): Promise<SocialPostMetricRecord[]> {
    const rows = await this.prisma.socialPostMetric.findMany({
      where: { customerId },
      orderBy: { collectedAt: 'desc' },
    })
    return rows.map((r) => this.toRecord(r))
  }

  private toRecord(raw: RawMetric): SocialPostMetricRecord {
    return {
      postizPostId: raw.postizPostId,
      customerId: raw.customerId,
      provider: raw.provider,
      views: raw.views,
      reach: raw.reach,
      likes: raw.likes,
      comments: raw.comments,
      shares: raw.shares,
      saves: raw.saves,
      raw: raw.raw,
      collectedAt: raw.collectedAt,
    }
  }
}
