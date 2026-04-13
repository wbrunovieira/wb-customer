import { IUserIdentityRepository } from '@/domain/auth/application/repositories/i-user-identity.repository'
import { UserIdentity } from '@/domain/auth/enterprise/entities/user-identity'
import { Email } from '@/domain/auth/enterprise/value-objects/email.vo'

export class InMemoryUserIdentityRepository implements IUserIdentityRepository {
  public items: UserIdentity[] = []

  async findById(id: string): Promise<UserIdentity | null> {
    return (
      this.items.find((i) => i.id.value === id && !i.isDeleted) ?? null
    )
  }

  async findByEmail(email: Email): Promise<UserIdentity | null> {
    return (
      this.items.find((i) => i.email.equals(email) && !i.isDeleted) ?? null
    )
  }

  async findAll(): Promise<UserIdentity[]> {
    return this.items.filter((i) => !i.isDeleted)
  }

  async save(userIdentity: UserIdentity): Promise<void> {
    const index = this.items.findIndex((i) => i.id.equals(userIdentity.id))
    if (index >= 0) {
      this.items[index] = userIdentity
    } else {
      this.items.push(userIdentity)
    }
  }
}
