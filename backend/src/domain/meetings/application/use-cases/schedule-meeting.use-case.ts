import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { IMeetingRepository } from '../repositories/i-meeting.repository'
import { IMeetingTypeRepository } from '../repositories/i-meeting-type.repository'
import { ICalendarAdapter } from '../services/i-calendar.adapter'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { ICustomerActivityRepository } from '@/domain/customers/application/repositories/i-customer-activity.repository'
import { Meeting } from '../../enterprise/entities/meeting'
import { CustomerActivity } from '@/domain/customers/enterprise/entities/customer-activity'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { MeetingTypeNotFoundError } from '../../domain/exceptions/meeting-type-not-found.error'

export interface ScheduleMeetingRequest {
  customerId: string
  contactId?: string
  meetingTypeId?: string
  title: string
  description?: string
  startAt: Date
  endAt: Date
  attendeeEmails: string[]
  timeZone?: string
  scheduledByUserId: string
}

export interface ScheduleMeetingResponse {
  meetingId: string
  googleEventId: string | null
  meetLink: string | null
}

export type ScheduleMeetingResult = Either<
  CustomerNotFoundError | MeetingTypeNotFoundError,
  ScheduleMeetingResponse
>

@Injectable()
export class ScheduleMeetingUseCase {
  constructor(
    private readonly meetingRepo: IMeetingRepository,
    private readonly meetingTypeRepo: IMeetingTypeRepository,
    private readonly calendarAdapter: ICalendarAdapter,
    private readonly customerRepo: ICustomerRepository,
    private readonly activityRepo: ICustomerActivityRepository,
  ) {}

  async execute(request: ScheduleMeetingRequest): Promise<ScheduleMeetingResult> {
    const customer = await this.customerRepo.findById(request.customerId)
    if (!customer) return left(new CustomerNotFoundError(request.customerId))

    if (request.meetingTypeId) {
      const type = await this.meetingTypeRepo.findById(request.meetingTypeId)
      if (!type) return left(new MeetingTypeNotFoundError(request.meetingTypeId))
    }

    let googleEventId: string | null = null
    let meetLink: string | null = null
    let attendees: Meeting['attendees'] = request.attendeeEmails.map((email) => ({
      email,
      responseStatus: 'needsAction' as const,
    }))

    try {
      const calResult = await this.calendarAdapter.createEvent({
        title: request.title,
        startAt: request.startAt,
        endAt: request.endAt,
        attendeeEmails: request.attendeeEmails,
        description: request.description,
        timeZone: request.timeZone,
      })
      googleEventId = calResult.googleEventId
      meetLink = calResult.meetLink
      attendees = calResult.attendees
    } catch {
      // Calendar adapter unavailable (e.g. mock mode without credentials) — continue without event
    }

    const meeting = Meeting.create({
      customerId: request.customerId,
      contactId: request.contactId,
      meetingTypeId: request.meetingTypeId,
      title: request.title,
      description: request.description,
      startAt: request.startAt,
      endAt: request.endAt,
      googleEventId,
      meetLink,
      attendees,
      scheduledByUserId: request.scheduledByUserId,
    })

    await this.meetingRepo.save(meeting)

    await this.activityRepo.save(
      CustomerActivity.create({
        customerId: request.customerId,
        userId: request.scheduledByUserId,
        type: 'meeting_scheduled',
        description: `Meeting "${request.title}" scheduled`,
        metadata: { meetingId: meeting.id.value },
      }),
    )

    return right({ meetingId: meeting.id.value, googleEventId, meetLink })
  }
}
