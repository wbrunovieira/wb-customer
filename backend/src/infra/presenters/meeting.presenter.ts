import { Meeting, MeetAttendee } from '@/domain/meetings/enterprise/entities/meeting'

export interface MeetingHttpResponse {
  id: string
  customerId: string
  contactId: string | null
  meetingTypeId: string | null
  title: string
  description: string | null
  startAt: string
  endAt: string | null
  actualStartAt: string | null
  actualEndAt: string | null
  googleEventId: string | null
  meetLink: string | null
  attendees: MeetAttendee[]
  status: string
  scheduledByUserId: string
  recordingDriveId: string | null
  recordingUrl: string | null
  meetingSummary: string | null
  createdAt: string
  updatedAt: string
}

export class MeetingPresenter {
  static toHTTP(meeting: Meeting): MeetingHttpResponse {
    return {
      id: meeting.id.value,
      customerId: meeting.customerId,
      contactId: meeting.contactId,
      meetingTypeId: meeting.meetingTypeId,
      title: meeting.title,
      description: meeting.description,
      startAt: meeting.startAt.toISOString(),
      endAt: meeting.endAt ? meeting.endAt.toISOString() : null,
      actualStartAt: meeting.actualStartAt ? meeting.actualStartAt.toISOString() : null,
      actualEndAt: meeting.actualEndAt ? meeting.actualEndAt.toISOString() : null,
      googleEventId: meeting.googleEventId,
      meetLink: meeting.meetLink,
      attendees: meeting.attendees,
      status: meeting.status.value,
      scheduledByUserId: meeting.scheduledByUserId,
      recordingDriveId: meeting.recordingDriveId,
      recordingUrl: meeting.recordingUrl,
      meetingSummary: meeting.meetingSummary,
      createdAt: meeting.createdAt.toISOString(),
      updatedAt: meeting.updatedAt.toISOString(),
    }
  }
}
