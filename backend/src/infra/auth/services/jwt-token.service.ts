import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'crypto'
import { ITokenService, TokenPayload } from '@/domain/auth/application/services/i-token.service'
import { Env } from '@/env/env'

@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  generateAccessToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
    })
  }

  generateRefreshToken(): string {
    return randomUUID()
  }

  getRefreshTokenExpiry(): Date {
    const raw = this.configService.get('JWT_REFRESH_EXPIRES_IN')
    const ms = this.parseExpiry(raw)
    return new Date(Date.now() + ms)
  }

  private parseExpiry(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/)
    if (!match) throw new Error(`Invalid expiry format: ${value}`)
    const amount = parseInt(match[1], 10)
    const unit = match[2]
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    }
    return amount * multipliers[unit]
  }
}
