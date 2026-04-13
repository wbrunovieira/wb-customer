import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/unique-entity-id'

export interface UserProfileProps {
  userId: string
  name: string
  phone?: string | null
  avatarUrl?: string | null
  createdAt: Date
  updatedAt: Date
}

export class UserProfile extends Entity<UserProfileProps> {
  private constructor(props: UserProfileProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: { userId: string; name: string; phone?: string; avatarUrl?: string },
    id?: UniqueEntityID,
  ): UserProfile {
    return new UserProfile(
      {
        userId: props.userId,
        name: props.name,
        phone: props.phone ?? null,
        avatarUrl: props.avatarUrl ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
  }

  static restore(props: UserProfileProps, id: UniqueEntityID): UserProfile {
    return new UserProfile(props, id)
  }

  get userId(): string {
    return this.props.userId
  }

  get name(): string {
    return this.props.name
  }

  get phone(): string | null {
    return this.props.phone ?? null
  }

  get avatarUrl(): string | null {
    return this.props.avatarUrl ?? null
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  update(data: {
    name?: string
    phone?: string | null
    avatarUrl?: string | null
  }): void {
    if (data.name !== undefined) this.props.name = data.name
    if (data.phone !== undefined) this.props.phone = data.phone
    if (data.avatarUrl !== undefined) this.props.avatarUrl = data.avatarUrl
    this.props.updatedAt = new Date()
  }
}
