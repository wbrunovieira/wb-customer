import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { TaskStatus } from '../value-objects/task-status.vo'
import { RecurrenceType } from '../value-objects/recurrence-type.vo'
import { TaskCreatedEvent } from '../events/task-created.event'
import { TaskStatusChangedEvent } from '../events/task-status-changed.event'

export interface TaskProps {
  customerId: string
  sprintId?: string | null
  parentTaskId?: string | null
  title: string
  description?: string | null
  status: TaskStatus
  ownerUserId: string
  assigneeUserId?: string | null
  startAt?: Date | null
  endAt?: Date | null
  estimatedHours?: number | null
  trackedSeconds: number
  impact?: number | null
  confidence?: number | null
  effort?: number | null
  recurrenceType: RecurrenceType
  recurrenceRule?: unknown | null
  progress: number
  boardPosition: number
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export class Task extends AggregateRoot<TaskProps> {
  private constructor(props: TaskProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<TaskProps, 'createdAt' | 'updatedAt' | 'trackedSeconds' | 'progress' | 'boardPosition'> & {
      trackedSeconds?: number
      progress?: number
      boardPosition?: number
    },
    id?: UniqueEntityID,
  ): Task {
    const task = new Task(
      {
        ...props,
        trackedSeconds: props.trackedSeconds ?? 0,
        progress: props.progress ?? 0,
        boardPosition: props.boardPosition ?? 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
    task.addDomainEvent(
      new TaskCreatedEvent(task.id.value, props.customerId, props.ownerUserId, props.title),
    )
    return task
  }

  static restore(props: TaskProps, id: UniqueEntityID): Task {
    return new Task(props, id)
  }

  // ─── Getters ─────────────────────────────
  get customerId(): string { return this.props.customerId }
  get sprintId(): string | null { return this.props.sprintId ?? null }
  get parentTaskId(): string | null { return this.props.parentTaskId ?? null }
  get title(): string { return this.props.title }
  get description(): string | null { return this.props.description ?? null }
  get status(): TaskStatus { return this.props.status }
  get ownerUserId(): string { return this.props.ownerUserId }
  get assigneeUserId(): string | null { return this.props.assigneeUserId ?? null }
  get startAt(): Date | null { return this.props.startAt ?? null }
  get endAt(): Date | null { return this.props.endAt ?? null }
  get estimatedHours(): number | null { return this.props.estimatedHours ?? null }
  get trackedSeconds(): number { return this.props.trackedSeconds }
  get impact(): number | null { return this.props.impact ?? null }
  get confidence(): number | null { return this.props.confidence ?? null }
  get effort(): number | null { return this.props.effort ?? null }
  get recurrenceType(): RecurrenceType { return this.props.recurrenceType }
  get recurrenceRule(): unknown | null { return this.props.recurrenceRule ?? null }
  get progress(): number { return this.props.progress }
  get boardPosition(): number { return this.props.boardPosition }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }
  get deletedAt(): Date | null { return this.props.deletedAt ?? null }

  get iceScore(): number | null {
    if (this.props.impact != null && this.props.confidence != null && this.props.effort != null && this.props.effort > 0) {
      return (this.props.impact * this.props.confidence) / this.props.effort
    }
    return null
  }

  // ─── Mutations ────────────────────────────
  update(fields: Partial<Pick<TaskProps, 'title' | 'description' | 'sprintId' | 'assigneeUserId' | 'startAt' | 'endAt' | 'estimatedHours' | 'impact' | 'confidence' | 'effort' | 'recurrenceType' | 'recurrenceRule' | 'boardPosition'>>): void {
    Object.assign(this.props, fields)
    this.props.updatedAt = new Date()
  }

  addTrackedTime(secs: number): void {
    this.props.trackedSeconds += secs
    this.props.updatedAt = new Date()
  }

  changeStatus(newStatus: TaskStatus): void {
    const from = this.props.status.value
    this.props.status = newStatus
    this.props.updatedAt = new Date()
    this.addDomainEvent(new TaskStatusChangedEvent(this.id.value, this.props.customerId, from, newStatus.value))
  }

  recalculateProgress(completedItems: number, totalItems: number): void {
    this.props.progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
    this.props.updatedAt = new Date()
  }

  softDelete(): void {
    this.props.deletedAt = new Date()
    this.props.updatedAt = new Date()
  }
}
