import {
  ICalendarAdapter,
  CalendarEventData,
  CreateEventParams,
  CreateEventResult,
} from '@/domain/meetings/application/services/i-calendar.adapter'
import { MeetAttendee } from '@/domain/meetings/enterprise/entities/meeting'

export class MockCalendarAdapter implements ICalendarAdapter {
  public createdEvents: { params: CreateEventParams; result: CreateEventResult }[] = []
  public updatedEvents: { googleEventId: string; attendees: MeetAttendee[] }[] = []
  public cancelledEventIds: string[] = []

  async createEvent(params: CreateEventParams): Promise<CreateEventResult> {
    const result: CreateEventResult = {
      googleEventId: `google-event-${Date.now()}`,
      meetLink: 'https://meet.google.com/mock-link',
      attendees: params.attendeeEmails.map((email) => ({
        email,
        responseStatus: 'needsAction' as const,
      })),
    }
    this.createdEvents.push({ params, result })
    return result
  }

  async updateEvent(
    googleEventId: string,
    params: Partial<CreateEventParams>,
  ): Promise<{ attendees: MeetAttendee[] }> {
    const attendees: MeetAttendee[] = (params.attendeeEmails ?? []).map((email) => ({
      email,
      responseStatus: 'needsAction' as const,
    }))
    this.updatedEvents.push({ googleEventId, attendees })
    return { attendees }
  }

  async cancelEvent(googleEventId: string): Promise<void> {
    this.cancelledEventIds.push(googleEventId)
  }

  async getEvent(googleEventId: string): Promise<CalendarEventData> {
    return {
      googleEventId,
      attendees: [] as MeetAttendee[],
    }
  }
}
