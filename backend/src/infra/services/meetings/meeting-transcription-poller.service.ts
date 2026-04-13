import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { IMeetingRepository } from '@/domain/meetings/application/repositories/i-meeting.repository'
import { Env } from '@/env/env'

interface TranscriptionJobResult {
  status: 'pending' | 'completed' | 'failed'
  transcript?: string
  summary?: string
}

@Injectable()
export class MeetingTranscriptionPollerService {
  private readonly logger = new Logger(MeetingTranscriptionPollerService.name)

  constructor(
    private readonly meetingRepo: IMeetingRepository,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async pollTranscriptionJobs(): Promise<void> {
    const baseUrl = this.config.get('TRANSCRIPTOR_BASE_URL', { infer: true })
    const apiKey = this.config.get('TRANSCRIPTOR_API_KEY', { infer: true })

    if (!baseUrl || !apiKey) return

    const meetings = await this.meetingRepo.findWithPendingTranscription()

    for (const meeting of meetings) {
      if (!meeting.transcriptionJobId) continue

      try {
        const response = await fetch(`${baseUrl}/jobs/${meeting.transcriptionJobId}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        const data = (await response.json()) as TranscriptionJobResult

        if (data.status === 'completed' && data.transcript) {
          meeting.setTranscript(data.transcript)
          if (data.summary) meeting.updateSummary(data.summary)
          await this.meetingRepo.save(meeting)
          this.logger.log(`Transcription completed for meeting ${meeting.id.value}`)
        } else if (data.status === 'failed') {
          meeting.setTranscriptionJob(null as unknown as string)
          await this.meetingRepo.save(meeting)
          this.logger.warn(`Transcription failed for meeting ${meeting.id.value}`)
        }
      } catch (err) {
        this.logger.warn(`Error polling transcription for meeting ${meeting.id.value}: ${err}`)
      }
    }
  }
}
