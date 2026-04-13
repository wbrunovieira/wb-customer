import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { MeetingStatus } from '../value-objects/meeting-status.vo'
import { MeetingScheduledEvent } from '../events/meeting-scheduled.event'
import { MeetingCompletedEvent } from '../events/meeting-completed.event'

export interface MeetAttendee {
  email: string
  responseStatus: 'needsAction' | 'accepted' | 'declined' | 'tentative'
  organizer?: boolean
  self?: boolean
}

export interface MeetingProps {
  customerId: string
  contactId?: string | null
  meetingTypeId?: string | null
  title: string
  description?: string | null
  startAt: Date
  endAt?: Date | null
  actualStartAt?: Date | null
  actualEndAt?: Date | null
  googleEventId?: string | null
  meetLink?: string | null
  attendees: MeetAttendee[]
  status: MeetingStatus
  scheduledByUserId: string
  // Recording
  recordingDriveId?: string | null
  recordingUrl?: string | null
  recordingMovedAt?: Date | null
  // Transcription
  transcriptionJobId?: string | null
  transcriptText?: string | null
  transcribedAt?: Date | null
  nativeTranscriptUrl?: string | null
  meetingSummary?: string | null
  createdAt: Date
  updatedAt: Date
}

export class Meeting extends AggregateRoot<MeetingProps> {
  private constructor(props: MeetingProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<MeetingProps, 'createdAt' | 'updatedAt' | 'status'> & { status?: MeetingStatus },
    id?: UniqueEntityID,
  ): Meeting {
    const isNew = !id
    const meeting = new Meeting(
      {
        ...props,
        status: props.status ?? MeetingStatus.createUnsafe('scheduled'),
        attendees: props.attendees ?? [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
    if (isNew) {
      meeting.addDomainEvent(
        new MeetingScheduledEvent(
          meeting.id.value,
          props.customerId,
          props.scheduledByUserId,
          props.title,
        ),
      )
    }
    return meeting
  }

  static restore(props: MeetingProps, id: UniqueEntityID): Meeting {
    return new Meeting(props, id)
  }

  get customerId(): string { return this.props.customerId }
  get contactId(): string | null { return this.props.contactId ?? null }
  get meetingTypeId(): string | null { return this.props.meetingTypeId ?? null }
  get title(): string { return this.props.title }
  get description(): string | null { return this.props.description ?? null }
  get startAt(): Date { return this.props.startAt }
  get endAt(): Date | null { return this.props.endAt ?? null }
  get actualStartAt(): Date | null { return this.props.actualStartAt ?? null }
  get actualEndAt(): Date | null { return this.props.actualEndAt ?? null }
  get googleEventId(): string | null { return this.props.googleEventId ?? null }
  get meetLink(): string | null { return this.props.meetLink ?? null }
  get attendees(): MeetAttendee[] { return this.props.attendees }
  get status(): MeetingStatus { return this.props.status }
  get scheduledByUserId(): string { return this.props.scheduledByUserId }
  get recordingDriveId(): string | null { return this.props.recordingDriveId ?? null }
  get recordingUrl(): string | null { return this.props.recordingUrl ?? null }
  get recordingMovedAt(): Date | null { return this.props.recordingMovedAt ?? null }
  get transcriptionJobId(): string | null { return this.props.transcriptionJobId ?? null }
  get transcriptText(): string | null { return this.props.transcriptText ?? null }
  get transcribedAt(): Date | null { return this.props.transcribedAt ?? null }
  get nativeTranscriptUrl(): string | null { return this.props.nativeTranscriptUrl ?? null }
  get meetingSummary(): string | null { return this.props.meetingSummary ?? null }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  update(
    fields: Partial<Pick<MeetingProps, 'title' | 'description' | 'startAt' | 'endAt' | 'attendees' | 'contactId' | 'meetingTypeId'>>,
  ): void {
    if (fields.title !== undefined) this.props.title = fields.title
    if (fields.description !== undefined) this.props.description = fields.description
    if (fields.startAt !== undefined) this.props.startAt = fields.startAt
    if (fields.endAt !== undefined) this.props.endAt = fields.endAt
    if (fields.attendees !== undefined) this.props.attendees = fields.attendees
    if (fields.contactId !== undefined) this.props.contactId = fields.contactId
    if (fields.meetingTypeId !== undefined) this.props.meetingTypeId = fields.meetingTypeId
    this.props.updatedAt = new Date()
  }

  cancel(): void {
    this.props.status = MeetingStatus.createUnsafe('cancelled')
    this.props.updatedAt = new Date()
  }

  markEnded(actualEndAt: Date): void {
    this.props.status = MeetingStatus.createUnsafe('ended')
    this.props.actualEndAt = actualEndAt
    if (!this.props.actualStartAt) this.props.actualStartAt = this.props.startAt
    this.props.updatedAt = new Date()
    this.addDomainEvent(new MeetingCompletedEvent(this.id.value, this.props.customerId))
  }

  setRecording(driveId: string, url: string): void {
    this.props.recordingDriveId = driveId
    this.props.recordingUrl = url
    this.props.recordingMovedAt = new Date()
    this.props.updatedAt = new Date()
  }

  setTranscriptionJob(jobId: string): void {
    this.props.transcriptionJobId = jobId
    this.props.updatedAt = new Date()
  }

  setTranscript(text: string): void {
    this.props.transcriptText = text
    this.props.transcribedAt = new Date()
    this.props.transcriptionJobId = null
    this.props.updatedAt = new Date()
  }

  setNativeTranscript(url: string, summary: string | null, transcript: string | null): void {
    this.props.nativeTranscriptUrl = url
    if (summary !== null) this.props.meetingSummary = summary
    if (transcript !== null) {
      this.props.transcriptText = transcript
      this.props.transcribedAt = new Date()
    }
    this.props.updatedAt = new Date()
  }

  updateSummary(summary: string | null): void {
    this.props.meetingSummary = summary
    this.props.updatedAt = new Date()
  }

  updateAttendees(attendees: MeetAttendee[]): void {
    this.props.attendees = attendees
    this.props.updatedAt = new Date()
  }
}
