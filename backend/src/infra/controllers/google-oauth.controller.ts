import {
  Controller,
  Get,
  Query,
  Delete,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import type { Response } from 'express'
import { google } from 'googleapis'
import { ConfigService } from '@nestjs/config'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger'
import { Env } from '@/env/env'
import { IGoogleTokenService } from '@/domain/meetings/application/services/i-google-token.service'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
]

@ApiTags('Google OAuth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('google')
export class GoogleOAuthController {
  constructor(
    private readonly tokenService: IGoogleTokenService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private createOAuthClient() {
    return new google.auth.OAuth2(
      this.config.get('GOOGLE_CLIENT_ID', { infer: true }),
      this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
      this.config.get('GOOGLE_REDIRECT_URI', { infer: true }),
    )
  }

  @Get('auth')
  @ApiOperation({ summary: 'Redirect to Google OAuth consent screen' })
  @ApiResponse({ status: 302, description: 'Redirects to Google consent page' })
  async authorize(@Res() res: Response) {
    const client = this.createOAuthClient()
    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    })
    return res.redirect(url)
  }

  @Get('callback')
  @ApiOperation({ summary: 'Google OAuth callback — exchanges code for token' })
  @ApiQuery({ name: 'code', required: true, description: 'Authorization code from Google' })
  @ApiResponse({ status: 200, description: 'Token stored successfully' })
  @ApiResponse({ status: 401, description: 'Missing authorization code' })
  async callback(@Query('code') code: string, @Res() res: Response) {
    if (!code) throw new UnauthorizedException('Missing authorization code')

    const client = this.createOAuthClient()
    const { tokens } = await client.getToken(code)

    client.setCredentials({ access_token: tokens.access_token })
    const oauth2 = google.oauth2({ version: 'v2', auth: client })
    const { data } = await oauth2.userinfo.get()

    await this.tokenService.saveToken({
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiresAt: new Date(tokens.expiry_date!),
      scope: tokens.scope ?? SCOPES.join(' '),
      email: data.email!,
    })

    return res.json({ message: 'Google account connected', email: data.email })
  }

  @Delete('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect Google account' })
  @ApiResponse({ status: 204, description: 'Google account disconnected' })
  async disconnect() {
    await this.tokenService.deleteToken()
  }
}
