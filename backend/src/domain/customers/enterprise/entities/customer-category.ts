import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'

export interface CustomerCategoryProps {
  name: string
  description?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export class CustomerCategory extends AggregateRoot<CustomerCategoryProps> {
  private constructor(props: CustomerCategoryProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Pick<CustomerCategoryProps, 'name' | 'description'> & { isActive?: boolean },
    id?: UniqueEntityID,
  ): CustomerCategory {
    return new CustomerCategory(
      {
        name: props.name,
        description: props.description ?? null,
        isActive: props.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      id,
    )
  }

  static restore(
    props: CustomerCategoryProps,
    id: UniqueEntityID,
  ): CustomerCategory {
    return new CustomerCategory(props, id)
  }

  get name(): string {
    return this.props.name
  }

  get description(): string | null {
    return this.props.description ?? null
  }

  get isActive(): boolean {
    return this.props.isActive
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt ?? null
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null && this.props.deletedAt !== undefined
  }

  update(fields: Partial<Pick<CustomerCategoryProps, 'name' | 'description' | 'isActive'>>): void {
    if (fields.name !== undefined) this.props.name = fields.name
    if (fields.description !== undefined) this.props.description = fields.description
    if (fields.isActive !== undefined) this.props.isActive = fields.isActive
    this.props.updatedAt = new Date()
  }

  softDelete(): void {
    this.props.deletedAt = new Date()
    this.props.updatedAt = new Date()
  }
}
