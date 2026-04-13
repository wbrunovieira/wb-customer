import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IMeetingRepository } from '../repositories/i-meeting.repository'
import { ICalendarAdapter } from '../services/i-calendar.adapter'
import { MeetingNotFoundError } from '../../domain/exceptions/meeting-not-found.error'
import { MeetingAlreadyCancelledError } from '../../domain/exceptions/meeting-already-cancelled.error'

export interface UpdateMeetingRequest {
  customerId: string
  meetingId: string
  title?: string
  description?: string
  startAt?: Date
  endAt?: Date
  attendeeEmails?: string[]
  timeZone?: string
}

export type UpdateMeetingResult = Either<MeetingNotFoundError | MeetingAlreadyCancelledError, void>

@Injectable()
export class UpdateMeetingUseCase {
  constructor(
    private readonly meetingRepo: IMeetingRepository,
    private readonly calendarAdapter: ICalendarAdapter,
  ) {}

  async execute(request: UpdateMeetingRequest): Promise<UpdateMeetingResult> {
    const meeting = await this.meetingRepo.findById(request.meetingId)
    if (!meeting || meeting.customerId !== request.customerId) {
      return left(new MeetingNotFoundError(request.meetingId))
    }
    if (meeting.status.isCancelled()) {
      return left(new MeetingAlreadyCancelledError(request.meetingId))
    }

    let updatedAttendees = meeting.attendees

    if (meeting.googleEventId) {
      try {
        const result = await this.calendarAdapter.updateEvent(meeting.googleEventId, {
          title: request.title,
          description: request.description,
          startAt: request.startAt,
          endAt: request.endAt,
          attendeeEmails: request.attendeeEmails,
          timeZone: request.timeZone,
        })
        updatedAttendees = result.attendees
      } catch { /* non-fatal */ }
    }

    meeting.update({
      title: request.title,
      description: request.description,
      startAt: request.startAt,
      endAt: request.endAt,
      attendees: updatedAttendees,
    })

    await this.meetingRepo.save(meeting)
    return right(undefined)
  }
}
