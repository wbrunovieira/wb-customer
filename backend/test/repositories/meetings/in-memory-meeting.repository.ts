import {
  IMeetingRepository,
  FindManyMeetingsParams,
  PaginatedMeetings,
} from '@/domain/meetings/application/repositories/i-meeting.repository'
import { Meeting } from '@/domain/meetings/enterprise/entities/meeting'

export class InMemoryMeetingRepository implements IMeetingRepository {
  public items: Meeting[] = []

  async findById(id: string): Promise<Meeting | null> {
    return this.items.find((m) => m.id.value === id) ?? null
  }

  async findByCustomerId(customerId: string, params: FindManyMeetingsParams): Promise<PaginatedMeetings> {
    let filtered = this.items.filter((m) => m.customerId === customerId)

    if (params.status) {
      filtered = filtered.filter((m) => m.status.value === params.status)
    }

    if (params.meetingTypeId) {
      filtered = filtered.filter((m) => m.meetingTypeId === params.meetingTypeId)
    }

    const total = filtered.length
    const page = params.page ?? 1
    const limit = params.limit ?? 20
    const items = filtered.slice((page - 1) * limit, page * limit)

    return { items, total }
  }

  async findByGoogleEventId(googleEventId: string): Promise<Meeting | null> {
    return this.items.find((m) => m.googleEventId === googleEventId) ?? null
  }

  async findScheduledBefore(before: Date): Promise<Meeting[]> {
    return this.items.filter(
      (m) => m.status.isScheduled() && m.startAt < before,
    )
  }

  async findEndedWithoutRecording(since: Date): Promise<Meeting[]> {
    return this.items.filter(
      (m) => m.status.isEnded() && !m.recordingDriveId && m.actualEndAt && m.actualEndAt > since,
    )
  }

  async findWithPendingTranscription(): Promise<Meeting[]> {
    return this.items.filter((m) => !!m.transcriptionJobId)
  }

  async save(meeting: Meeting): Promise<void> {
    const index = this.items.findIndex((m) => m.id.equals(meeting.id))
    if (index >= 0) {
      this.items[index] = meeting
    } else {
      this.items.push(meeting)
    }
  }
}
