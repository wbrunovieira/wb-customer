import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { WhatsAppMediaService } from './whatsapp-media.service'
import { GoToPhoneMatcherService } from '@/infra/services/goto/goto-phone-matcher.service'

export interface EvolutionWebhookPayload {
  event?: string
  key?: {
    id?: string
    fromMe?: boolean
    remoteJid?: string
  }
  pushName?: string
  messageType?: string
  message?: {
    conversation?: string
    extendedTextMessage?: { text?: string }
    imageMessage?: { caption?: string; mimetype?: string }
    audioMessage?: { seconds?: number; mimetype?: string }
    videoMessage?: { seconds?: number; caption?: string; mimetype?: string }
    documentMessage?: { fileName?: string; caption?: string; mimetype?: string }
  }
  messageTimestamp?: number
  [key: string]: unknown
}

/** Session window — new message within 2h of last activity is appended */
const SESSION_WINDOW_MS = 2 * 60 * 60 * 1000

@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly phoneMatcher: GoToPhoneMatcherService,
    private readonly mediaService: WhatsAppMediaService,
  ) {}

  async process(payload: EvolutionWebhookPayload): Promise<void> {
    // Only handle incoming messages
    if (payload.event !== 'messages.upsert') return

    const key = payload.key
    if (!key?.id || !key?.remoteJid) return

    // Ignore groups
    if (key.remoteJid.endsWith('@g.us')) return

    const messageId = key.id
    const remoteJid = key.remoteJid
    const fromMe = key.fromMe ?? false
    const messageType = payload.messageType ?? 'conversation'
    const timestamp = payload.messageTimestamp
      ? new Date(payload.messageTimestamp * 1000)
      : new Date()

    // Idempotency
    const existing = await this.prisma.whatsAppMessage.findUnique({ where: { messageId } })
    if (existing) return

    // Extract phone from JID: "5511999998888@s.whatsapp.net" → "5511999998888"
    const phone = remoteJid.split('@')[0]

    // Match to CRM
    const match = await this.phoneMatcher.match(phone)
    if (!match) {
      this.logger.debug(`WhatsApp — no CRM match for ${phone}`)
      return
    }

    const text = this.extractText(payload)
    const mediaLabel = this.buildMediaLabel(messageType, payload)
    const senderName = fromMe ? 'Você' : (payload.pushName ?? phone)

    // Session grouping — find open activity within 2h
    const since = new Date(Date.now() - SESSION_WINDOW_MS)
    const openActivity = await this.prisma.activity.findFirst({
      where: {
        customerId: match.customerId,
        type: 'whatsapp',
        deletedAt: null,
        createdAt: { gte: since },
        whatsappMessages: {
          some: { remoteJid },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    let activityId: string

    if (openActivity) {
      // Append to existing session
      activityId = openActivity.id
      const line = this.buildDescriptionLine(senderName, text, mediaLabel, timestamp)
      await this.prisma.activity.update({
        where: { id: activityId },
        data: {
          description: openActivity.description
            ? `${openActivity.description}\n${line}`
            : line,
          updatedAt: new Date(),
        },
      })
    } else {
      // New session
      const displayName = payload.pushName ?? phone
      const line = this.buildDescriptionLine(senderName, text, mediaLabel, timestamp)

      const created = await this.prisma.activity.create({
        data: {
          customerId: match.customerId,
          contactId: match.contactId ?? null,
          type: 'whatsapp',
          status: 'open',
          subject: `WhatsApp — ${displayName}`,
          description: line,
          createdByUserId: 'evolution-webhook',
        },
      })
      activityId = created.id
      this.logger.log(`WhatsApp Activity created: ${activityId} for ${phone}`)
    }

    // Create WhatsAppMessage record
    await this.prisma.whatsAppMessage.create({
      data: {
        activityId,
        messageId,
        remoteJid,
        fromMe,
        senderName,
        text: text ?? null,
        messageType,
        mediaLabel: mediaLabel ?? null,
        timestamp,
      },
    })

    // Handle media in background (non-blocking)
    const isDownloadable = ['audioMessage', 'videoMessage', 'imageMessage', 'documentMessage'].includes(messageType)
    if (isDownloadable) {
      this.mediaService
        .process(messageId, remoteJid, messageType, activityId, match.customerId)
        .catch((err) => this.logger.error(`WhatsApp media error: ${err}`))
    }
  }

  private extractText(payload: EvolutionWebhookPayload): string | null {
    const msg = payload.message
    if (!msg) return null
    return (
      msg.conversation ??
      msg.extendedTextMessage?.text ??
      msg.imageMessage?.caption ??
      msg.videoMessage?.caption ??
      msg.documentMessage?.caption ??
      null
    )
  }

  private buildMediaLabel(
    messageType: string,
    payload: EvolutionWebhookPayload,
  ): string | null {
    const msg = payload.message
    switch (messageType) {
      case 'audioMessage': {
        const secs = msg?.audioMessage?.seconds
        return secs ? `🎤 Áudio (${secs}s)` : '🎤 Áudio'
      }
      case 'videoMessage': {
        const secs = msg?.videoMessage?.seconds
        return secs ? `🎥 Vídeo (${secs}s)` : '🎥 Vídeo'
      }
      case 'imageMessage':
        return '📷 Imagem'
      case 'documentMessage': {
        const name = msg?.documentMessage?.fileName
        return name ? `📄 ${name}` : '📄 Documento'
      }
      case 'stickerMessage':
        return '😄 Sticker'
      case 'locationMessage':
        return '📍 Localização'
      case 'reactionMessage':
        return null
      default:
        return null
    }
  }

  private buildDescriptionLine(
    sender: string,
    text: string | null,
    mediaLabel: string | null,
    timestamp: Date,
  ): string {
    const time = timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const content = text ?? mediaLabel ?? ''
    return `[${time}] ${sender}: ${content}`
  }
}
