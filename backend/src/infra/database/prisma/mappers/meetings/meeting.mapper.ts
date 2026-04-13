import { Meeting as PrismaMeeting, Prisma } from '@prisma/client'
import { Meeting, MeetAttendee } from '@/domain/meetings/enterprise/entities/meeting'
import { MeetingStatus } from '@/domain/meetings/enterprise/value-objects/meeting-status.vo'
import { UniqueEntityID } from '@/core/unique-entity-id'

type MeetingUpsertData = {
  id: string
  customerId: string
  contactId: string | null
  meetingTypeId: string | null
  title: string
  description: string | null
  startAt: Date
  endAt: Date | null
  actualStartAt: Date | null
  actualEndAt: Date | null
  googleEventId: string | null
  meetLink: string | null
  attendees: Prisma.InputJsonValue
  status: PrismaMeeting['status']
  scheduledByUserId: string
  recordingDriveId: string | null
  recordingUrl: string | null
  recordingMovedAt: Date | null
  transcriptionJobId: string | null
  transcriptText: string | null
  transcribedAt: Date | null
  nativeTranscriptUrl: string | null
  meetingSummary: string | null
  createdAt: Date
  updatedAt: Date
}

export class MeetingMapper {
  static toDomain(raw: PrismaMeeting): Meeting {
    return Meeting.restore(
      {
        customerId: raw.customerId,
        contactId: raw.contactId,
        meetingTypeId: raw.meetingTypeId,
        title: raw.title,
        description: raw.description,
        startAt: raw.startAt,
        endAt: raw.endAt,
        actualStartAt: raw.actualStartAt,
        actualEndAt: raw.actualEndAt,
        googleEventId: raw.googleEventId,
        meetLink: raw.meetLink,
        attendees: raw.attendees as unknown as MeetAttendee[],
        status: MeetingStatus.createUnsafe(raw.status),
        scheduledByUserId: raw.scheduledByUserId,
        recordingDriveId: raw.recordingDriveId,
        recordingUrl: raw.recordingUrl,
        recordingMovedAt: raw.recordingMovedAt,
        transcriptionJobId: raw.transcriptionJobId,
        transcriptText: raw.transcriptText,
        transcribedAt: raw.transcribedAt,
        nativeTranscriptUrl: raw.nativeTranscriptUrl,
        meetingSummary: raw.meetingSummary,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(meeting: Meeting): MeetingUpsertData {
    return {
      id: meeting.id.value,
      customerId: meeting.customerId,
      contactId: meeting.contactId,
      meetingTypeId: meeting.meetingTypeId,
      title: meeting.title,
      description: meeting.description,
      startAt: meeting.startAt,
      endAt: meeting.endAt,
      actualStartAt: meeting.actualStartAt,
      actualEndAt: meeting.actualEndAt,
      googleEventId: meeting.googleEventId,
      meetLink: meeting.meetLink,
      attendees: meeting.attendees as unknown as Prisma.InputJsonValue,
      status: meeting.status.value as PrismaMeeting['status'],
      scheduledByUserId: meeting.scheduledByUserId,
      recordingDriveId: meeting.recordingDriveId,
      recordingUrl: meeting.recordingUrl,
      recordingMovedAt: meeting.recordingMovedAt,
      transcriptionJobId: meeting.transcriptionJobId,
      transcriptText: meeting.transcriptText,
      transcribedAt: meeting.transcribedAt,
      nativeTranscriptUrl: meeting.nativeTranscriptUrl,
      meetingSummary: meeting.meetingSummary,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
    }
  }
}
