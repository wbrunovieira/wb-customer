import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { GoToApiClient } from './goto-api.client'
import { IStorageAdapter } from '@/domain/documents/application/services/i-storage.adapter'
import { ICustomerFolderService } from '@/domain/customers/application/services/i-customer-folder.service'
import { TranscriptorService } from '@/infra/services/meetings/transcriptor.service'

@Injectable()
export class GoToRecordingService {
  private readonly logger = new Logger(GoToRecordingService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiClient: GoToApiClient,
    private readonly storage: IStorageAdapter,
    private readonly folderService: ICustomerFolderService,
    private readonly transcriptor: TranscriptorService,
  ) {}

  /**
   * Cron job: finds answered GoTo activities without recordings and attempts to
   * download + store them.
   */
  async run(): Promise<void> {
    const pending = await this.prisma.activity.findMany({
      where: {
        type: 'phone_call',
        gotoCallId: { not: null },
        gotoCallOutcome: 'answered',
        gotoRecordingUrl: null,
        deletedAt: null,
      },
      select: {
        id: true,
        customerId: true,
        gotoCallId: true,
      },
      take: 20,
    })

    if (pending.length === 0) return

    for (const activity of pending) {
      try {
        await this.processRecording(activity.id, activity.customerId, activity.gotoCallId!)
      } catch (err) {
        this.logger.error(`GoTo recording error for activity ${activity.id}: ${err}`)
      }
    }
  }

  private async processRecording(
    activityId: string,
    customerId: string,
    gotoCallId: string,
  ): Promise<void> {
    const report = await this.apiClient.getCallReport(gotoCallId)
    if (!report?.recordingId) {
      this.logger.debug(`No recordingId yet for call ${gotoCallId}`)
      return
    }

    const buffer = await this.apiClient.downloadRecording(report.recordingId)
    if (!buffer) {
      this.logger.warn(`Could not download recording for ${report.recordingId}`)
      return
    }

    // Ensure customer Drive folder exists
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

    const fileName = `ligacao-goto-${gotoCallId}.mp3`
    const uploaded = await this.storage.uploadFile({
      folderId,
      fileName,
      mimeType: 'audio/mpeg',
      buffer,
    })

    await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        gotoRecordingDriveId: uploaded.fileId,
        gotoRecordingUrl: uploaded.viewUrl,
        audioUrl: uploaded.viewUrl,
      },
    })

    this.logger.log(`Recording saved for activity ${activityId}`)

    // Submit for transcription if not already queued
    const updated = await this.prisma.activity.findUnique({ where: { id: activityId } })
    if (updated && !updated.gotoTranscriptionJobId) {
      try {
        const jobId = await this.transcriptor.submitVideo(buffer, fileName)
        await this.prisma.activity.update({
          where: { id: activityId },
          data: { gotoTranscriptionJobId: jobId },
        })
        this.logger.log(`Transcription queued for activity ${activityId}, job: ${jobId}`)
      } catch (err) {
        this.logger.warn(`Failed to submit transcription for activity ${activityId}: ${err}`)
      }
    }
  }
}
