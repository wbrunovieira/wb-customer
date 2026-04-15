import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'

export interface WhatsAppMessageData {
  id: string
  remoteJid: string
  fromMe: boolean
  senderName?: string | null
  text?: string | null
  messageType: string
  mediaUrl?: string | null
  mediaLabel?: string | null
  mediaTranscriptText?: string | null
  timestamp: string
}

export interface ActivityProps {
  customerId: string
  contactId?: string | null
  type: string
  status?: string
  subject?: string | null
  description?: string | null
  scheduledAt?: Date | null
  occurredAt?: Date | null
  durationSecs?: number | null
  audioUrl?: string | null
  transcriptText?: string | null
  externalId?: string | null
  direction?: string | null
  createdByUserId: string
  assignedToUserId?: string | null
  deletedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  // GoTo Connect
  gotoCallId?: string | null
  gotoCallOutcome?: string | null
  gotoDuration?: number | null
  gotoRecordingDriveId?: string | null
  gotoRecordingUrl?: string | null
  gotoRecordingUrl2?: string | null
  gotoTranscriptionJobId?: string | null
  gotoTranscriptText?: string | null
  callContactType?: string | null
  // Gmail / Email
  emailMessageId?: string | null
  emailThreadId?: string | null
  emailSubject?: string | null
  emailFromAddress?: string | null
  emailFromName?: string | null
  emailReplied?: boolean
  // WhatsApp messages (read-only, loaded from relation)
  whatsappMessages?: WhatsAppMessageData[]
}

export class Activity extends AggregateRoot<ActivityProps> {
  private constructor(props: ActivityProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<ActivityProps, 'createdAt' | 'updatedAt'> & { status?: string },
    id?: UniqueEntityID,
  ): Activity {
    return new Activity(
      {
        ...props,
        status: props.status ?? 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
  }

  static restore(props: ActivityProps, id: UniqueEntityID): Activity {
    return new Activity(props, id)
  }

  get customerId(): string { return this.props.customerId }
  get contactId(): string | null | undefined { return this.props.contactId }
  get type(): string { return this.props.type }
  get status(): string { return this.props.status ?? 'open' }
  get subject(): string | null | undefined { return this.props.subject }
  get description(): string | null | undefined { return this.props.description }
  get scheduledAt(): Date | null | undefined { return this.props.scheduledAt }
  get occurredAt(): Date | null | undefined { return this.props.occurredAt }
  get durationSecs(): number | null | undefined { return this.props.durationSecs }
  get audioUrl(): string | null | undefined { return this.props.audioUrl }
  get transcriptText(): string | null | undefined { return this.props.transcriptText }
  get externalId(): string | null | undefined { return this.props.externalId }
  get direction(): string | null | undefined { return this.props.direction }
  get createdByUserId(): string { return this.props.createdByUserId }
  get assignedToUserId(): string | null | undefined { return this.props.assignedToUserId }
  get deletedAt(): Date | null | undefined { return this.props.deletedAt }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }
  // GoTo
  get gotoCallId(): string | null | undefined { return this.props.gotoCallId }
  get gotoCallOutcome(): string | null | undefined { return this.props.gotoCallOutcome }
  get gotoDuration(): number | null | undefined { return this.props.gotoDuration }
  get gotoRecordingDriveId(): string | null | undefined { return this.props.gotoRecordingDriveId }
  get gotoRecordingUrl(): string | null | undefined { return this.props.gotoRecordingUrl }
  get gotoRecordingUrl2(): string | null | undefined { return this.props.gotoRecordingUrl2 }
  get gotoTranscriptionJobId(): string | null | undefined { return this.props.gotoTranscriptionJobId }
  get gotoTranscriptText(): string | null | undefined { return this.props.gotoTranscriptText }
  get callContactType(): string | null | undefined { return this.props.callContactType }
  // Email
  get emailMessageId(): string | null | undefined { return this.props.emailMessageId }
  get emailThreadId(): string | null | undefined { return this.props.emailThreadId }
  get emailSubject(): string | null | undefined { return this.props.emailSubject }
  get emailFromAddress(): string | null | undefined { return this.props.emailFromAddress }
  get emailFromName(): string | null | undefined { return this.props.emailFromName }
  get emailReplied(): boolean { return this.props.emailReplied ?? false }
  get whatsappMessages(): WhatsAppMessageData[] | undefined { return this.props.whatsappMessages }

  update(fields: Partial<Pick<ActivityProps, 'subject' | 'description' | 'status' | 'scheduledAt' | 'occurredAt' | 'durationSecs' | 'assignedToUserId' | 'transcriptText'>>): void {
    Object.assign(this.props, fields)
    this.props.updatedAt = new Date()
  }

  complete(occurredAt?: Date): void {
    this.props.status = 'done'
    this.props.occurredAt = occurredAt ?? new Date()
    this.props.updatedAt = new Date()
  }

  cancel(): void {
    this.props.status = 'cancelled'
    this.props.updatedAt = new Date()
  }

  softDelete(): void {
    this.props.deletedAt = new Date()
    this.props.updatedAt = new Date()
  }
}
