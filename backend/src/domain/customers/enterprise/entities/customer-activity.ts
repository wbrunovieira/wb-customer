import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/unique-entity-id'

export type CustomerActivityType =
  | 'created'
  | 'updated'
  | 'assigned'
  | 'contact_added'
  | 'document_uploaded'
  | 'meeting_scheduled'
  | 'meeting_completed'
  | 'note_added'
  | 'email_received'

export interface CustomerActivityProps {
  customerId: string
  userId: string
  type: CustomerActivityType
  description: string
  metadata?: Record<string, unknown> | null
  createdAt: Date
}

export class CustomerActivity extends Entity<CustomerActivityProps> {
  private constructor(props: CustomerActivityProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<CustomerActivityProps, 'createdAt'>,
    id?: UniqueEntityID,
  ): CustomerActivity {
    return new CustomerActivity(
      {
        ...props,
        createdAt: new Date(),
      },
      id,
    )
  }

  static restore(
    props: CustomerActivityProps,
    id: UniqueEntityID,
  ): CustomerActivity {
    return new CustomerActivity(props, id)
  }

  get customerId(): string {
    return this.props.customerId
  }

  get userId(): string {
    return this.props.userId
  }

  get type(): CustomerActivityType {
    return this.props.type
  }

  get description(): string {
    return this.props.description
  }

  get metadata(): Record<string, unknown> | null {
    return this.props.metadata ?? null
  }

  get createdAt(): Date {
    return this.props.createdAt
  }
}
