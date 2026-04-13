import { Meeting } from '../../enterprise/entities/meeting'

export interface FindManyMeetingsParams {
  status?: string
  meetingTypeId?: string
  page?: number
  limit?: number
}

export interface PaginatedMeetings {
  items: Meeting[]
  total: number
}

export abstract class IMeetingRepository {
  abstract findById(id: string): Promise<Meeting | null>
  abstract findByCustomerId(customerId: string, params: FindManyMeetingsParams): Promise<PaginatedMeetings>
  abstract findByGoogleEventId(googleEventId: string): Promise<Meeting | null>
  abstract findScheduledBefore(before: Date): Promise<Meeting[]>
  abstract findEndedWithoutRecording(since: Date): Promise<Meeting[]>
  abstract findWithPendingTranscription(): Promise<Meeting[]>
  abstract save(meeting: Meeting): Promise<void>
}
