import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/unique-entity-id'

export interface TaskTagProps {
  customerId: string | null
  name: string
  color: string
  createdAt: Date
}

export class TaskTag extends Entity<TaskTagProps> {
  private constructor(props: TaskTagProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(props: Omit<TaskTagProps, 'createdAt'>, id?: UniqueEntityID): TaskTag {
    return new TaskTag({ ...props, createdAt: new Date() }, id)
  }

  static restore(props: TaskTagProps, id: UniqueEntityID): TaskTag {
    return new TaskTag(props, id)
  }

  get customerId(): string | null { return this.props.customerId }
  get name(): string { return this.props.name }
  get color(): string { return this.props.color }
  get createdAt(): Date { return this.props.createdAt }
}
