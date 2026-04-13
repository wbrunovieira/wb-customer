import { Injectable } from '@nestjs/common'
import {
  IGoogleTokenService,
  GoogleTokenData,
} from '@/domain/meetings/application/services/i-google-token.service'
import { PrismaService } from '@/infra/database/prisma/prisma.service'

const SINGLETON_ID = 'google-token-singleton'
const EXPIRY_BUFFER_MS = 5 * 60 * 1000

@Injectable()
export class GoogleTokenService implements IGoogleTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async getToken(): Promise<GoogleTokenData | null> {
    const raw = await this.prisma.googleToken.findFirst()
    if (!raw) return null
    return {
      accessToken: raw.accessToken,
      refreshToken: raw.refreshToken,
      expiresAt: raw.expiresAt,
      scope: raw.scope,
      email: raw.email,
    }
  }

  async saveToken(data: GoogleTokenData): Promise<void> {
    await this.prisma.googleToken.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    })
  }

  async deleteToken(): Promise<void> {
    await this.prisma.googleToken.deleteMany()
  }

  isTokenExpired(token: { expiresAt: Date }): boolean {
    return token.expiresAt.getTime() - Date.now() < EXPIRY_BUFFER_MS
  }
}
