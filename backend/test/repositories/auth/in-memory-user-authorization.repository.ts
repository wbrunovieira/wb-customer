import { IUserAuthorizationRepository } from '@/domain/auth/application/repositories/i-user-authorization.repository'
import { UserAuthorization } from '@/domain/auth/enterprise/entities/user-authorization'

export class InMemoryUserAuthorizationRepository
  implements IUserAuthorizationRepository
{
  public items: UserAuthorization[] = []

  async findByUserId(userId: string): Promise<UserAuthorization | null> {
    return this.items.find((a) => a.userId === userId) ?? null
  }

  async save(userAuthorization: UserAuthorization): Promise<void> {
    const index = this.items.findIndex((a) =>
      a.id.equals(userAuthorization.id),
    )
    if (index >= 0) {
      this.items[index] = userAuthorization
    } else {
      this.items.push(userAuthorization)
    }
  }
}
