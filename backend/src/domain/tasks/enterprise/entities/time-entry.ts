import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'

export interface TimeEntryProps {
  taskId: string
  userId: string
  startedAt: Date
  stoppedAt: Date | null
  durationSecs: number | null
  createdAt: Date
}

export class TimeEntry extends AggregateRoot<TimeEntryProps> {
  private constructor(props: TimeEntryProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(props: { taskId: string; userId: string }, id?: UniqueEntityID): TimeEntry {
    return new TimeEntry(
      {
        taskId: props.taskId,
        userId: props.userId,
        startedAt: new Date(),
        stoppedAt: null,
        durationSecs: null,
        createdAt: new Date(),
      },
      id,
    )
  }

  static restore(props: TimeEntryProps, id: UniqueEntityID): TimeEntry {
    return new TimeEntry(props, id)
  }

  get taskId(): string { return this.props.taskId }
  get userId(): string { return this.props.userId }
  get startedAt(): Date { return this.props.startedAt }
  get stoppedAt(): Date | null { return this.props.stoppedAt }
  get durationSecs(): number | null { return this.props.durationSecs }
  get createdAt(): Date { return this.props.createdAt }
  get isRunning(): boolean { return this.props.stoppedAt === null }

  stop(): void {
    if (this.props.stoppedAt) return
    const now = new Date()
    this.props.stoppedAt = now
    this.props.durationSecs = Math.floor(
      (now.getTime() - this.props.startedAt.getTime()) / 1000,
    )
  }
}
