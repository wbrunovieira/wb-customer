import { MeetAttendee } from '../../enterprise/entities/meeting'

export interface CreateEventParams {
  title: string
  startAt: Date
  endAt: Date
  attendeeEmails: string[]
  description?: string
  timeZone?: string
}

export interface CreateEventResult {
  googleEventId: string
  meetLink: string | null
  attendees: MeetAttendee[]
}

export interface CalendarEventData {
  googleEventId: string
  attendees: MeetAttendee[]
}

export abstract class ICalendarAdapter {
  abstract createEvent(params: CreateEventParams): Promise<CreateEventResult>
  abstract updateEvent(googleEventId: string, params: Partial<CreateEventParams>): Promise<{ attendees: MeetAttendee[] }>
  abstract cancelEvent(googleEventId: string): Promise<void>
  abstract getEvent(googleEventId: string): Promise<CalendarEventData>
}
