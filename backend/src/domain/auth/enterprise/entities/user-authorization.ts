import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/unique-entity-id'
import { UserRole } from '../value-objects/user-role.vo'

export interface UserAuthorizationProps {
  userId: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export class UserAuthorization extends Entity<UserAuthorizationProps> {
  private constructor(props: UserAuthorizationProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: { userId: string; role: UserRole },
    id?: UniqueEntityID,
  ): UserAuthorization {
    return new UserAuthorization(
      {
        userId: props.userId,
        role: props.role,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
  }

  static restore(
    props: UserAuthorizationProps,
    id: UniqueEntityID,
  ): UserAuthorization {
    return new UserAuthorization(props, id)
  }

  get userId(): string {
    return this.props.userId
  }

  get role(): UserRole {
    return this.props.role
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  updateRole(role: UserRole): void {
    this.props.role = role
    this.props.updatedAt = new Date()
  }
}
