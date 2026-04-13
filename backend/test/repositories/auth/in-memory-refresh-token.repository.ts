import { IRefreshTokenRepository } from '@/domain/auth/application/repositories/i-refresh-token.repository'
import { RefreshToken } from '@/domain/auth/enterprise/entities/refresh-token'

export class InMemoryRefreshTokenRepository
  implements IRefreshTokenRepository
{
  public items: RefreshToken[] = []

  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.items.find((t) => t.token === token) ?? null
  }

  async save(refreshToken: RefreshToken): Promise<void> {
    const index = this.items.findIndex((t) => t.id.equals(refreshToken.id))
    if (index >= 0) {
      this.items[index] = refreshToken
    } else {
      this.items.push(refreshToken)
    }
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    this.items
      .filter((t) => t.userId === userId && !t.isRevoked)
      .forEach((t) => t.revoke())
  }
}
