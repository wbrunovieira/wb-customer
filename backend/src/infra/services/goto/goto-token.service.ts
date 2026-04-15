import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Env } from '@/env/env'

interface GoToTokenData {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

@Injectable()
export class GoToTokenService implements OnModuleInit {
  private readonly logger = new Logger(GoToTokenService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Seed initial tokens from env if no record exists yet
    const initial = await this.prisma.goToToken.findUnique({ where: { id: 'singleton' } })
    if (initial) return

    const accessToken = this.config.get('GOTO_ACCESS_TOKEN', { infer: true })
    const refreshToken = this.config.get('GOTO_REFRESH_TOKEN', { infer: true })
    const expiresAtStr = this.config.get('GOTO_TOKEN_EXPIRES_AT', { infer: true })

    if (!accessToken || !refreshToken || !expiresAtStr) return

    await this.prisma.goToToken.create({
      data: {
        id: 'singleton',
        accessToken,
        refreshToken,
        expiresAt: new Date(expiresAtStr),
      },
    })
    this.logger.log('GoTo initial tokens seeded from env')
  }

  async getValidToken(): Promise<string> {
    const record = await this.prisma.goToToken.findUnique({ where: { id: 'singleton' } })
    if (!record) throw new Error('GoTo tokens not configured')

    // Refresh if expires within 60 seconds
    const bufferMs = 60 * 1000
    if (record.expiresAt.getTime() - Date.now() < bufferMs) {
      return this.refreshToken(record.refreshToken)
    }

    return record.accessToken
  }

  private async refreshToken(refreshToken: string): Promise<string> {
    const clientId = this.config.get('GOTO_CLIENT_ID', { infer: true })
    const clientSecret = this.config.get('GOTO_CLIENT_SECRET', { infer: true })

    if (!clientId || !clientSecret) throw new Error('GoTo OAuth credentials not configured')

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const resp = await fetch('https://authentication.logmeininc.com/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`GoTo token refresh failed: ${resp.status} ${text}`)
    }

    const data = (await resp.json()) as {
      access_token: string
      refresh_token: string
      expires_in: number
    }

    const expiresAt = new Date(Date.now() + data.expires_in * 1000)
    await this.prisma.goToToken.update({
      where: { id: 'singleton' },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
      },
    })

    this.logger.log('GoTo access token refreshed')
    return data.access_token
  }

  async getToken(): Promise<GoToTokenData | null> {
    return this.prisma.goToToken.findUnique({ where: { id: 'singleton' } })
  }
}
