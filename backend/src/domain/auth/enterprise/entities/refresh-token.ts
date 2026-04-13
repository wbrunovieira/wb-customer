import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/unique-entity-id'

export interface RefreshTokenProps {
  userId: string
  token: string
  expiresAt: Date
  revokedAt?: Date | null
  createdAt: Date
}

export class RefreshToken extends Entity<RefreshTokenProps> {
  private constructor(props: RefreshTokenProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: { userId: string; token: string; expiresAt: Date },
    id?: UniqueEntityID,
  ): RefreshToken {
    return new RefreshToken(
      {
        userId: props.userId,
        token: props.token,
        expiresAt: props.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
      },
      id,
    )
  }

  static restore(props: RefreshTokenProps, id: UniqueEntityID): RefreshToken {
    return new RefreshToken(props, id)
  }

  get userId(): string {
    return this.props.userId
  }

  get token(): string {
    return this.props.token
  }

  get expiresAt(): Date {
    return this.props.expiresAt
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt ?? null
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get isExpired(): boolean {
    return new Date() > this.props.expiresAt
  }

  get isRevoked(): boolean {
    return this.props.revokedAt !== null && this.props.revokedAt !== undefined
  }

  get isValid(): boolean {
    return !this.isExpired && !this.isRevoked
  }

  revoke(): void {
    this.props.revokedAt = new Date()
  }
}
