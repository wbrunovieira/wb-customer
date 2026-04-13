import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IMeetingRepository } from '../repositories/i-meeting.repository'
import { ICalendarAdapter } from '../services/i-calendar.adapter'
import { MeetingNotFoundError } from '../../domain/exceptions/meeting-not-found.error'
import { MeetingAlreadyCancelledError } from '../../domain/exceptions/meeting-already-cancelled.error'

export type CancelMeetingResult = Either<MeetingNotFoundError | MeetingAlreadyCancelledError, void>

@Injectable()
export class CancelMeetingUseCase {
  constructor(
    private readonly meetingRepo: IMeetingRepository,
    private readonly calendarAdapter: ICalendarAdapter,
  ) {}

  async execute(request: { customerId: string; meetingId: string }): Promise<CancelMeetingResult> {
    const meeting = await this.meetingRepo.findById(request.meetingId)
    if (!meeting || meeting.customerId !== request.customerId) {
      return left(new MeetingNotFoundError(request.meetingId))
    }
    if (meeting.status.isCancelled()) {
      return left(new MeetingAlreadyCancelledError(request.meetingId))
    }

    if (meeting.googleEventId) {
      try {
        await this.calendarAdapter.cancelEvent(meeting.googleEventId)
      } catch { /* non-fatal */ }
    }

    meeting.cancel()
    await this.meetingRepo.save(meeting)
    return right(undefined)
  }
}
