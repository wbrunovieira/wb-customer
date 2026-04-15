import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { GoToApiClient } from './goto-api.client'
import { GoToPhoneMatcherService } from './goto-phone-matcher.service'
import { NotificationsService } from '@/infra/notifications/notifications.service'

export interface GoToWebhookPayload {
  conversationSpaceId?: string
  dialogId?: string
  [key: string]: unknown
}

@Injectable()
export class GoToWebhookService {
  private readonly logger = new Logger(GoToWebhookService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiClient: GoToApiClient,
    private readonly phoneMatcher: GoToPhoneMatcherService,
    private readonly notifications: NotificationsService,
  ) {}

  async process(payload: GoToWebhookPayload): Promise<void> {
    const conversationSpaceId = payload.conversationSpaceId ?? payload.dialogId
    if (!conversationSpaceId) {
      this.logger.warn('GoTo webhook missing conversationSpaceId')
      return
    }

    // Idempotency check
    const existing = await this.prisma.activity.findFirst({
      where: { gotoCallId: conversationSpaceId },
    })
    if (existing) {
      this.logger.debug(`GoTo call ${conversationSpaceId} already processed`)
      return
    }

    // Fetch full call report from GoTo API
    const report = await this.apiClient.getCallReport(conversationSpaceId)
    if (!report) {
      this.logger.warn(`Could not fetch GoTo call report for ${conversationSpaceId}`)
      return
    }

    // Determine the external phone number to match
    const externalPhone = report.direction === 'inbound' ? report.caller : report.callee
    if (!externalPhone) {
      this.logger.warn(`GoTo call ${conversationSpaceId} has no phone to match`)
      return
    }

    const match = await this.phoneMatcher.match(externalPhone)
    if (!match) {
      this.logger.debug(`GoTo call ${conversationSpaceId} — no CRM match for ${externalPhone}`)
      return
    }

    const durationSecs = report.durationSeconds ?? null
    const durationLabel = durationSecs != null
      ? `${Math.floor(durationSecs / 60)}min ${durationSecs % 60}s`
      : null

    const phoneDisplay = this.phoneMatcher.normalize(externalPhone)
    const subject = durationLabel
      ? `Ligação realizada — ${phoneDisplay} (${durationLabel})`
      : `Ligação — ${phoneDisplay}`

    const description = [
      `GoTo Call ID: ${conversationSpaceId}`,
      report.callOutcome ? `Resultado: ${report.callOutcome}` : null,
      report.direction ? `Direção: ${report.direction}` : null,
      durationLabel ? `Duração: ${durationLabel}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    await this.prisma.activity.create({
      data: {
        customerId: match.customerId,
        contactId: match.contactId ?? null,
        type: 'phone_call',
        status: 'done',
        subject,
        description,
        direction: report.direction ?? null,
        durationSecs,
        occurredAt: report.startTime ? new Date(report.startTime) : new Date(),
        gotoCallId: conversationSpaceId,
        gotoCallOutcome: report.callOutcome ?? null,
        gotoDuration: durationSecs,
        createdByUserId: 'goto-webhook',
      },
    })

    this.logger.log(`GoTo Activity created for call ${conversationSpaceId} → customer ${match.customerId}`)

    this.notifications.pushBroadcast({
      type: 'activity.phone_call',
      title: 'Nova ligação',
      body: subject,
      meta: { customerId: match.customerId, gotoCallId: conversationSpaceId },
    })
  }
}
