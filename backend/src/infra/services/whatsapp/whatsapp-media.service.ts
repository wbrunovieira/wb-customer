import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { EvolutionApiClient } from './evolution-api.client'
import { IStorageAdapter } from '@/domain/documents/application/services/i-storage.adapter'
import { ICustomerFolderService } from '@/domain/customers/application/services/i-customer-folder.service'
import { TranscriptorService } from '@/infra/services/meetings/transcriptor.service'

const TRANSCRIBABLE = ['audioMessage', 'videoMessage']

@Injectable()
export class WhatsAppMediaService {
  private readonly logger = new Logger(WhatsAppMediaService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolutionClient: EvolutionApiClient,
    private readonly storage: IStorageAdapter,
    private readonly folderService: ICustomerFolderService,
    private readonly transcriptor: TranscriptorService,
  ) {}

  async process(
    messageId: string,
    remoteJid: string,
    messageType: string,
    activityId: string,
    customerId: string,
  ): Promise<void> {
    // Download from Evolution
    const media = await this.evolutionClient.getBase64FromMedia(messageId, remoteJid)
    if (!media?.base64) {
      this.logger.warn(`No media data for message ${messageId}`)
      return
    }

    const buffer = Buffer.from(media.base64, 'base64')
    const ext = this.mimeToExt(media.mimetype)
    const fileName = media.fileName ?? `whatsapp-${messageId}.${ext}`

    // Ensure Drive folder
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) return

    let folderId = customer.driveFolderId
    if (!folderId || folderId.startsWith('local-folder-')) {
      folderId = await this.folderService.createFolder(customer.name)
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { driveFolderId: folderId },
      })
    }

    const uploaded = await this.storage.uploadFile({
      folderId,
      fileName,
      mimeType: media.mimetype,
      buffer,
    })

    await this.prisma.whatsAppMessage.update({
      where: { messageId },
      data: {
        mediaDriveId: uploaded.fileId,
        mediaUrl: uploaded.viewUrl,
      },
    })

    this.logger.log(`WhatsApp media saved for message ${messageId}`)

    // Submit for transcription if applicable
    if (TRANSCRIBABLE.includes(messageType)) {
      try {
        const jobId = await this.transcriptor.submitVideo(buffer, fileName)
        await this.prisma.whatsAppMessage.update({
          where: { messageId },
          data: { mediaTranscriptionJobId: jobId },
        })
        this.logger.log(`Transcription queued for message ${messageId}, job: ${jobId}`)
      } catch (err) {
        this.logger.warn(`Failed to submit transcription for message ${messageId}: ${err}`)
      }
    }
  }

  /** Cron job: polls Transcriptor for pending WhatsApp media transcriptions */
  async pollTranscriptions(): Promise<void> {
    const pending = await this.prisma.whatsAppMessage.findMany({
      where: {
        mediaTranscriptionJobId: { not: null },
        mediaTranscriptText: null,
      },
      take: 20,
    })

    for (const msg of pending) {
      try {
        const { status, error } = await this.transcriptor.getStatus(msg.mediaTranscriptionJobId!)
        if (status === 'done') {
          const { text } = await this.transcriptor.getResult(msg.mediaTranscriptionJobId!)
          await this.prisma.whatsAppMessage.update({
            where: { id: msg.id },
            data: { mediaTranscriptText: text },
          })
          this.logger.log(`WhatsApp transcription done for message ${msg.id}`)
        } else if (status === 'failed') {
          this.logger.warn(`WhatsApp transcription failed for ${msg.id}: ${error}`)
          await this.prisma.whatsAppMessage.update({
            where: { id: msg.id },
            data: { mediaTranscriptionJobId: null },
          })
        }
      } catch (err) {
        this.logger.error(`WhatsApp transcription poll error for ${msg.id}: ${err}`)
      }
    }
  }

  private mimeToExt(mimetype: string): string {
    const map: Record<string, string> = {
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'mp4',
      'video/mp4': 'mp4',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    return map[mimetype] ?? 'bin'
  }
}
