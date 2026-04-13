import { RefreshToken } from '../../enterprise/entities/refresh-token'

export abstract class IRefreshTokenRepository {
  abstract findByToken(token: string): Promise<RefreshToken | null>
  abstract save(refreshToken: RefreshToken): Promise<void>
  abstract revokeAllByUserId(userId: string): Promise<void>
}
