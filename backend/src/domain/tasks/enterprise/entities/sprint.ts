import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/unique-entity-id'

export interface SprintProps {
  customerId: string
  name: string
  startAt: Date
  endAt: Date
  createdAt: Date
  updatedAt: Date
}

export class Sprint extends Entity<SprintProps> {
  private constructor(props: SprintProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(props: Omit<SprintProps, 'createdAt' | 'updatedAt'>, id?: UniqueEntityID): Sprint {
    return new Sprint({ ...props, createdAt: new Date(), updatedAt: new Date() }, id)
  }

  static restore(props: SprintProps, id: UniqueEntityID): Sprint {
    return new Sprint(props, id)
  }

  get customerId(): string { return this.props.customerId }
  get name(): string { return this.props.name }
  get startAt(): Date { return this.props.startAt }
  get endAt(): Date { return this.props.endAt }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  update(fields: Partial<Pick<SprintProps, 'name' | 'startAt' | 'endAt'>>): void {
    if (fields.name !== undefined) this.props.name = fields.name
    if (fields.startAt !== undefined) this.props.startAt = fields.startAt
    if (fields.endAt !== undefined) this.props.endAt = fields.endAt
    this.props.updatedAt = new Date()
  }
}
