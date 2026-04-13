import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/unique-entity-id'

export interface ContactProps {
  customerId: string
  name: string
  email?: string | null
  phone?: string | null
  role?: string | null
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}

export class Contact extends Entity<ContactProps> {
  private constructor(props: ContactProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<ContactProps, 'createdAt' | 'updatedAt' | 'isPrimary'> & { isPrimary?: boolean },
    id?: UniqueEntityID,
  ): Contact {
    return new Contact(
      {
        ...props,
        isPrimary: props.isPrimary ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
  }

  static restore(props: ContactProps, id: UniqueEntityID): Contact {
    return new Contact(props, id)
  }

  get customerId(): string {
    return this.props.customerId
  }

  get name(): string {
    return this.props.name
  }

  get email(): string | null {
    return this.props.email ?? null
  }

  get phone(): string | null {
    return this.props.phone ?? null
  }

  get role(): string | null {
    return this.props.role ?? null
  }

  get isPrimary(): boolean {
    return this.props.isPrimary
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  update(
    fields: Partial<Pick<ContactProps, 'name' | 'email' | 'phone' | 'role' | 'isPrimary'>>,
  ): void {
    if (fields.name !== undefined) this.props.name = fields.name
    if (fields.email !== undefined) this.props.email = fields.email
    if (fields.phone !== undefined) this.props.phone = fields.phone
    if (fields.role !== undefined) this.props.role = fields.role
    if (fields.isPrimary !== undefined) this.props.isPrimary = fields.isPrimary
    this.props.updatedAt = new Date()
  }
}
