import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/unique-entity-id'

export type CustomerUserRole = 'master' | 'member'

export interface CustomerUserProps {
  userId: string
  customerId: string
  customerRole: CustomerUserRole
  createdBy: string
  createdAt: Date
  deletedAt?: Date | null
}

export class CustomerUser extends Entity<CustomerUserProps> {
  private constructor(props: CustomerUserProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<CustomerUserProps, 'createdAt' | 'deletedAt'>,
    id?: UniqueEntityID,
  ): CustomerUser {
    return new CustomerUser(
      {
        ...props,
        createdAt: new Date(),
        deletedAt: null,
      },
      id,
    )
  }

  static restore(props: CustomerUserProps, id: UniqueEntityID): CustomerUser {
    return new CustomerUser(props, id)
  }

  get userId(): string { return this.props.userId }
  get customerId(): string { return this.props.customerId }
  get customerRole(): CustomerUserRole { return this.props.customerRole }
  get createdBy(): string { return this.props.createdBy }
  get createdAt(): Date { return this.props.createdAt }
  get deletedAt(): Date | null { return this.props.deletedAt ?? null }
  get isDeleted(): boolean { return !!this.props.deletedAt }
  get isMaster(): boolean { return this.props.customerRole === 'master' }

  updateRole(role: CustomerUserRole): void {
    this.props.customerRole = role
  }

  softDelete(): void {
    this.props.deletedAt = new Date()
  }
}
