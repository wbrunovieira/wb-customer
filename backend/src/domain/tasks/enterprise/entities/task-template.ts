import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/unique-entity-id'

export interface TemplateTaskData {
  title: string
  description?: string | null
  status?: string
  estimatedHours?: number | null
  impact?: number | null
  confidence?: number | null
  effort?: number | null
}

export interface TaskTemplateProps {
  name: string
  description: string | null
  tasks: TemplateTaskData[]
  createdAt: Date
  updatedAt: Date
}

export class TaskTemplate extends Entity<TaskTemplateProps> {
  get name() { return this.props.name }
  get description() { return this.props.description }
  get tasks() { return this.props.tasks }
  get createdAt() { return this.props.createdAt }
  get updatedAt() { return this.props.updatedAt }

  update(fields: Partial<Pick<TaskTemplateProps, 'name' | 'description' | 'tasks'>>): void {
    Object.assign(this.props, fields)
    this.props.updatedAt = new Date()
  }

  static create(
    props: Omit<TaskTemplateProps, 'createdAt' | 'updatedAt'>,
    id?: UniqueEntityID,
  ): TaskTemplate {
    return new TaskTemplate(
      { ...props, createdAt: new Date(), updatedAt: new Date() },
      id,
    )
  }

  static restore(props: TaskTemplateProps, id: UniqueEntityID): TaskTemplate {
    return new TaskTemplate(props, id)
  }
}
