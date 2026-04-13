import { IUserProfileRepository } from '@/domain/auth/application/repositories/i-user-profile.repository'
import { UserProfile } from '@/domain/auth/enterprise/entities/user-profile'

export class InMemoryUserProfileRepository implements IUserProfileRepository {
  public items: UserProfile[] = []

  async findByUserId(userId: string): Promise<UserProfile | null> {
    return this.items.find((p) => p.userId === userId) ?? null
  }

  async findById(id: string): Promise<UserProfile | null> {
    return this.items.find((p) => p.id.value === id) ?? null
  }

  async save(userProfile: UserProfile): Promise<void> {
    const index = this.items.findIndex((p) => p.id.equals(userProfile.id))
    if (index >= 0) {
      this.items[index] = userProfile
    } else {
      this.items.push(userProfile)
    }
  }
}
