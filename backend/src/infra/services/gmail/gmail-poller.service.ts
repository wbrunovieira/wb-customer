import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { GmailService } from './gmail.service'
import { GoToPhoneMatcherService } from '@/infra/services/goto/goto-phone-matcher.service'

@Injectable()
export class GmailPollerService {
  private readonly logger = new Logger(GmailPollerService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly gmail: GmailService,
    private readonly phoneMatcher: GoToPhoneMatcherService,
  ) {}

  async poll(): Promise<void> {
    const tokenRecord = await this.prisma.googleToken.findFirst()
    if (!tokenRecord) {
      this.logger.debug('No Google token — skipping Gmail poll')
      return
    }

    const { messages, nextHistoryId } = await this.gmail.pollInbox(
      tokenRecord.gmailHistoryId ?? null,
    )

    for (const msg of messages) {
      await this.processIncoming(msg)
    }

    if (nextHistoryId && nextHistoryId !== tokenRecord.gmailHistoryId) {
      await this.prisma.googleToken.update({
        where: { id: tokenRecord.id },
        data: { gmailHistoryId: nextHistoryId },
      })
    }

    if (messages.length > 0) {
      this.logger.log(`Gmail poll: processed ${messages.length} new email(s)`)
    }
  }

  private async processIncoming(msg: {
    messageId: string
    threadId: string
    fromAddress: string
    fromName: string
    subject: string
    bodyText: string
    receivedAt: Date
  }): Promise<void> {
    // Idempotency
    const existing = await this.prisma.activity.findFirst({
      where: { emailMessageId: msg.messageId },
    })
    if (existing) return

    // Match sender email to Contact → Customer
    const match = await this.matchEmail(msg.fromAddress)
    if (!match) {
      this.logger.debug(`Gmail — no CRM match for ${msg.fromAddress}`)
      return
    }

    const preview = msg.bodyText.slice(0, 500)

    await this.prisma.activity.create({
      data: {
        customerId: match.customerId,
        contactId: match.contactId ?? null,
        type: 'email',
        status: 'open',
        subject: msg.subject,
        description: preview,
        emailMessageId: msg.messageId,
        emailThreadId: msg.threadId,
        emailSubject: msg.subject,
        emailFromAddress: msg.fromAddress,
        emailFromName: msg.fromName,
        emailReplied: false,
        occurredAt: msg.receivedAt,
        createdByUserId: 'gmail-poller',
      },
    })

    this.logger.log(`Gmail Activity created for email ${msg.messageId} → customer ${match.customerId}`)
  }

  private async matchEmail(
    email: string,
  ): Promise<{ customerId: string; contactId?: string } | null> {
    // Match Contact by email
    const contact = await this.prisma.contact.findFirst({
      where: {
        email,
        customer: { deletedAt: null },
      },
      select: { id: true, customerId: true },
    })
    if (contact) return { customerId: contact.customerId, contactId: contact.id }

    // Match Customer by email
    const customer = await this.prisma.customer.findFirst({
      where: { email, deletedAt: null },
      select: { id: true },
    })
    if (customer) return { customerId: customer.id }

    return null
  }
}
