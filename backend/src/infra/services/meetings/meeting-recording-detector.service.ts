import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { IMeetingRepository } from '@/domain/meetings/application/repositories/i-meeting.repository'

/**
 * Marks meetings as ended when their scheduled end time has passed.
 * Runs every 5 minutes and checks for meetings whose end time is in the past.
 *
 * Recording detection itself (Drive polling) is left for a future iteration
 * when the Google Drive adapter is wired up.
 */
@Injectable()
export class MeetingRecordingDetectorService {
  private readonly logger = new Logger(MeetingRecordingDetectorService.name)

  constructor(private readonly meetingRepo: IMeetingRepository) {}

  @Cron('*/15 * * * *') // every 15 minutes
  async detectEndedMeetings(): Promise<void> {
    const now = new Date()

    // 3-pass strategy: look back up to 4 hours to catch late-running meetings
    const windowStart = new Date(now.getTime() - 4 * 60 * 60 * 1000)

    const meetings = await this.meetingRepo.findScheduledBefore(now)

    for (const meeting of meetings) {
      if (!meeting.endAt) continue
      if (meeting.endAt < windowStart) continue

      try {
        meeting.markEnded(meeting.endAt)
        await this.meetingRepo.save(meeting)
        this.logger.log(`Marked meeting ${meeting.id.value} as ended`)
      } catch (err) {
        this.logger.error(`Error marking meeting ${meeting.id.value} as ended: ${err}`)
      }
    }
  }
}
