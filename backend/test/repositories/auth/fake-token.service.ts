import { randomUUID } from 'crypto'
import {
  ITokenService,
  TokenPayload,
} from '@/domain/auth/application/services/i-token.service'

export class FakeTokenService implements ITokenService {
  generateAccessToken(payload: TokenPayload): string {
    return `fake-access.${payload.sub}.${payload.role}`
  }

  generateRefreshToken(): string {
    return `fake-refresh.${randomUUID()}`
  }

  getRefreshTokenExpiry(): Date {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
}
