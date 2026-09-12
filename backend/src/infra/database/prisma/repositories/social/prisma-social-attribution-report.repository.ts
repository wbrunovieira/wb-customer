import { Injectable } from '@nestjs/common'
import {
  AttributedConversationRow,
  ISocialAttributionReportRepository,
} from '@/domain/social/application/repositories/i-social-attribution-report.repository'
import { PrismaService } from '../../prisma.service'

@Injectable()
export class PrismaSocialAttributionReportRepository
  implements ISocialAttributionReportRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findAttributedConversations(
    customerId: string,
    since: Date,
  ): Promise<AttributedConversationRow[]> {
    const rows = await this.prisma.activity.findMany({
      where: {
        customerId,
        deletedAt: null,
        attributionLinkId: { not: null },
        createdAt: { gte: since },
      },
      include: { attributionLink: true },
      orderBy: { createdAt: 'asc' },
    })

    return rows
      // O vínculo é opcional no schema; sem ele a linha não diz de onde veio.
      .filter((r) => r.attributionLink !== null)
      .map((r) => ({
        activityId: r.id,
        customerId: r.customerId,
        // occurredAt é o momento real da conversa quando preenchido; o webhook
        // do WhatsApp não preenche, então createdAt é o mais próximo disso.
        occurredAt: r.occurredAt ?? r.createdAt,
        linkId: r.attributionLink!.id,
        source: r.attributionLink!.source,
        postRef: r.attributionLink!.postRef,
        code: r.attributionLink!.code,
      }))
  }
}
