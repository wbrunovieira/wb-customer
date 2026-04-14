import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/unique-entity-id'

export interface ChecklistItemProps {
  taskId: string
  text: string
  isDone: boolean
  position: number
  createdAt: Date
}

export class ChecklistItem extends Entity<ChecklistItemProps> {
  private constructor(props: ChecklistItemProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(props: Omit<ChecklistItemProps, 'createdAt'>, id?: UniqueEntityID): ChecklistItem {
    return new ChecklistItem({ ...props, createdAt: new Date() }, id)
  }

  static restore(props: ChecklistItemProps, id: UniqueEntityID): ChecklistItem {
    return new ChecklistItem(props, id)
  }

  get taskId(): string { return this.props.taskId }
  get text(): string { return this.props.text }
  get isDone(): boolean { return this.props.isDone }
  get position(): number { return this.props.position }
  get createdAt(): Date { return this.props.createdAt }

  toggle(): void { this.props.isDone = !this.props.isDone }
}
