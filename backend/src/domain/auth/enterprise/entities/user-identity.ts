import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { Email } from '../value-objects/email.vo'
import { UserCreatedEvent } from '../events/user-created.event'

export interface UserIdentityProps {
  email: Email
  passwordHash: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export class UserIdentity extends AggregateRoot<UserIdentityProps> {
  private constructor(props: UserIdentityProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: { email: Email; passwordHash: string },
    id?: UniqueEntityID,
  ): UserIdentity {
    const isNew = !id
    const identity = new UserIdentity(
      {
        email: props.email,
        passwordHash: props.passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      id,
    )

    if (isNew) {
      identity.addDomainEvent(
        new UserCreatedEvent(identity.id.value, props.email.value, 'unknown'),
      )
    }

    return identity
  }

  static restore(props: UserIdentityProps, id: UniqueEntityID): UserIdentity {
    return new UserIdentity(props, id)
  }

  get email(): Email {
    return this.props.email
  }

  get passwordHash(): string {
    return this.props.passwordHash
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

  updatePassword(passwordHash: string): void {
    this.props.passwordHash = passwordHash
    this.props.updatedAt = new Date()
  }

  softDelete(): void {
    this.props.deletedAt = new Date()
    this.props.updatedAt = new Date()
  }
}
