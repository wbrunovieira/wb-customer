import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'

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
