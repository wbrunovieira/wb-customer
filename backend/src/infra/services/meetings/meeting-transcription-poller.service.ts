import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { IMeetingRepository } from '@/domain/meetings/application/repositories/i-meeting.repository'
import { TranscriptorService } from './transcriptor.service'
import { Env } from '@/env/env'

@Injectable()
export class MeetingTranscriptionPollerService {
  private readonly logger = new Logger(MeetingTranscriptionPollerService.name)

  constructor(
    private readonly meetingRepo: IMeetingRepository,
    private readonly transcriptor: TranscriptorService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async pollTranscriptionJobs(): Promise<void> {
    const calendarAdapter = this.config.get('CALENDAR_ADAPTER', { infer: true })
    if (calendarAdapter !== 'google-calendar') return

    const meetings = await this.meetingRepo.findWithPendingTranscription()
    if (meetings.length === 0) return

    for (const meeting of meetings) {
      if (!meeting.transcriptionJobId) continue

      try {
        const { status, error } = await this.transcriptor.getStatus(meeting.transcriptionJobId)

        if (status === 'done') {
          const { text } = await this.transcriptor.getResult(meeting.transcriptionJobId)
          meeting.setTranscript(text)
          await this.meetingRepo.save(meeting)
          this.logger.log(`Transcription completed for meeting ${meeting.id.value}`)
        } else if (status === 'failed') {
          this.logger.warn(`Transcription job failed for meeting ${meeting.id.value}: ${error}`)
          // Clear jobId so it can be retried manually
          meeting.setTranscriptionJob(null as unknown as string)
          await this.meetingRepo.save(meeting)
        }
        // 'pending' | 'processing' — still running, check again next cycle
      } catch (err) {
        this.logger.warn(`Error polling transcription for meeting ${meeting.id.value}: ${err}`)
      }
    }
  }
}
