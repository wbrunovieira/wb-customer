import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/unique-entity-id'

export interface TaskActivityLogProps {
  taskId: string
  userId: string
  action: string
  fromValue: string | null
  toValue: string | null
  createdAt: Date
}

export class TaskActivityLog extends Entity<TaskActivityLogProps> {
  private constructor(props: TaskActivityLogProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(props: Omit<TaskActivityLogProps, 'createdAt'>, id?: UniqueEntityID): TaskActivityLog {
    return new TaskActivityLog({ ...props, createdAt: new Date() }, id)
  }

  static restore(props: TaskActivityLogProps, id: UniqueEntityID): TaskActivityLog {
    return new TaskActivityLog(props, id)
  }

  get taskId(): string { return this.props.taskId }
  get userId(): string { return this.props.userId }
  get action(): string { return this.props.action }
  get fromValue(): string | null { return this.props.fromValue }
  get toValue(): string | null { return this.props.toValue }
  get createdAt(): Date { return this.props.createdAt }
}
