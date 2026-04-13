import { Injectable } from '@nestjs/common'
import {
  ICalendarAdapter,
  CreateEventParams,
  CreateEventResult,
  CalendarEventData,
} from '@/domain/meetings/application/services/i-calendar.adapter'
import { MeetAttendee } from '@/domain/meetings/enterprise/entities/meeting'

/**
 * No-op calendar adapter used when Google credentials are not configured.
 * All operations are silently no-ops and return empty/mock data.
 */
@Injectable()
export class MockCalendarAdapter implements ICalendarAdapter {
  async createEvent(params: CreateEventParams): Promise<CreateEventResult> {
    return {
      googleEventId: null as unknown as string,
      meetLink: null,
      attendees: params.attendeeEmails.map((email) => ({
        email,
        responseStatus: 'needsAction' as const,
      })),
    }
  }

  async updateEvent(
    _googleEventId: string,
    params: Partial<CreateEventParams>,
  ): Promise<{ attendees: MeetAttendee[] }> {
    return {
      attendees: (params.attendeeEmails ?? []).map((email) => ({
        email,
        responseStatus: 'needsAction' as const,
      })),
    }
  }

  async cancelEvent(_googleEventId: string): Promise<void> {
    // no-op
  }

  async getEvent(googleEventId: string): Promise<CalendarEventData> {
    return { googleEventId, attendees: [] }
  }
}
