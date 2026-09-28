import { Injectable } from '@nestjs/common'
import {
  ISocialPublicationRepository,
  ReconcilableTarget,
  SocialPublicationRecord,
  StoredSocialPublication,
  UpdateTargetStateInput,
} from '@/domain/social/application/repositories/i-social-publication.repository'
import { PrismaService } from '../../prisma.service'

type RawPublication = {
  id: string
  customerId: string
  postizGroupId: string
  content: string
  mode: string
  scheduledFor: Date
  attributionLinkId: string | null
  creativeIds: string[]
  createdByUserId: string
  createdAt: Date
  targets: {
    channelId: string
    provider: string
    postizPostId: string
    state: string
    failureReason: string | null
    publishedUrl: string | null
    lastCheckedAt: Date | null
  }[]
}

/** Estados sem volta: chegaram ao fim e não precisam ser perguntados de novo. */
// CANCELED entra aqui porque o post cancelado sumiu da fila do motor: a
// reconciliação, por desenho, deixa em paz o que sumiu, então sem isto ele
// voltaria a ser consultado para sempre sem nunca mudar de estado.
const TERMINAL_STATES = ['PUBLISHED', 'ERROR', 'CANCELED']

@Injectable()
export class PrismaSocialPublicationRepository
  implements ISocialPublicationRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(record: SocialPublicationRecord): Promise<string> {
    const created = await this.prisma.socialPublication.create({
      data: {
        customerId: record.customerId,
        postizGroupId: record.postizGroupId,
        content: record.content,
        mode: record.mode,
        scheduledFor: record.scheduledFor,
        attributionLinkId: record.attributionLinkId ?? null,
        creativeIds: record.creativeIds ?? [],
        createdByUserId: record.createdByUserId,
        // Publicação e destinos nascem juntos: uma publicação sem destino não
        // significa nada, e gravar em duas etapas deixaria esse estado existir.
        targets: { create: record.targets },
      },
    })
    return created.id
  }

  async findByCustomerId(customerId: string): Promise<StoredSocialPublication[]> {
    const raws = await this.prisma.socialPublication.findMany({
      where: { customerId },
      include: { targets: true },
      orderBy: { scheduledFor: 'desc' },
    })
    return raws.map((r) => this.toRecord(r))
  }

  async findByPostizPostId(postId: string): Promise<StoredSocialPublication | null> {
    const raw = await this.prisma.socialPublication.findFirst({
      where: { targets: { some: { postizPostId: postId } } },
      include: { targets: true },
    })
    return raw ? this.toRecord(raw) : null
  }

  async findTargetsToReconcile(limit = 200): Promise<ReconcilableTarget[]> {
    const rows = await this.prisma.socialPublicationTarget.findMany({
      where: { state: { notIn: TERMINAL_STATES } },
      include: { publication: true },
      orderBy: { publication: { scheduledFor: 'asc' } },
      take: limit,
    })

    return rows.map((t) => ({
      publicationId: t.publicationId,
      customerId: t.publication.customerId,
      postizGroupId: t.publication.postizGroupId,
      postizPostId: t.postizPostId,
      channelId: t.channelId,
      provider: t.provider,
      state: t.state,
      scheduledFor: t.publication.scheduledFor,
    }))
  }

  async findPublishedTargetsSince(
    since: Date,
    limit = 60,
  ): Promise<ReconcilableTarget[]> {
    const rows = await this.prisma.socialPublicationTarget.findMany({
      where: {
        state: 'PUBLISHED',
        publication: { scheduledFor: { gte: since } },
      },
      include: { publication: true },
      orderBy: { publication: { scheduledFor: 'desc' } },
      take: limit,
    })

    return rows.map((t) => ({
      publicationId: t.publicationId,
      customerId: t.publication.customerId,
      postizGroupId: t.publication.postizGroupId,
      postizPostId: t.postizPostId,
      channelId: t.channelId,
      provider: t.provider,
      state: t.state,
      scheduledFor: t.publication.scheduledFor,
    }))
  }

  async updateTargetState(input: UpdateTargetStateInput): Promise<void> {
    await this.prisma.socialPublicationTarget.updateMany({
      where: { postizPostId: input.postizPostId },
      data: {
        state: input.state,
        failureReason: input.failureReason ?? null,
        publishedUrl: input.publishedUrl ?? null,
        lastCheckedAt: input.checkedAt,
      },
    })
  }

  private toRecord(raw: RawPublication): StoredSocialPublication {
    return {
      id: raw.id,
      customerId: raw.customerId,
      postizGroupId: raw.postizGroupId,
      content: raw.content,
      mode: raw.mode as 'now' | 'schedule',
      scheduledFor: raw.scheduledFor,
      attributionLinkId: raw.attributionLinkId,
      creativeIds: raw.creativeIds,
      createdByUserId: raw.createdByUserId,
      createdAt: raw.createdAt,
      targets: raw.targets.map((t) => ({
        channelId: t.channelId,
        provider: t.provider,
        postizPostId: t.postizPostId,
        state: t.state,
        failureReason: t.failureReason,
        publishedUrl: t.publishedUrl,
        lastCheckedAt: t.lastCheckedAt,
      })),
    }
  }
}
