import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { IMeetingRepository } from '@/domain/meetings/application/repositories/i-meeting.repository'
import { ICalendarAdapter } from '@/domain/meetings/application/services/i-calendar.adapter'

@Injectable()
export class MeetingRsvpCheckerService {
  private readonly logger = new Logger(MeetingRsvpCheckerService.name)

  constructor(
    private readonly meetingRepo: IMeetingRepository,
    private readonly calendarAdapter: ICalendarAdapter,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkRsvpStatuses(): Promise<void> {
    const meetings = await this.meetingRepo.findScheduledBefore(
      new Date(Date.now() + 60 * 60 * 1000), // next 1h
    )

    for (const meeting of meetings) {
      if (!meeting.googleEventId) continue

      try {
        const event = await this.calendarAdapter.getEvent(meeting.googleEventId)
        if (event.attendees.length > 0) {
          meeting.updateAttendees(event.attendees)
          await this.meetingRepo.save(meeting)
        }
      } catch (err) {
        this.logger.warn(`Failed to check RSVP for meeting ${meeting.id.value}: ${err}`)
      }
    }
  }
}
