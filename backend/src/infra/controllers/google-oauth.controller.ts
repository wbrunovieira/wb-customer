import {
  Controller,
  Get,
  Post,
  Query,
  Delete,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
  Logger,
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
import { MeetingRecordingDetectorService } from '@/infra/services/meetings/meeting-recording-detector.service'
import { MeetingTranscriptionPollerService } from '@/infra/services/meetings/meeting-transcription-poller.service'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

@ApiTags('Google OAuth')
@Controller('google')
export class GoogleOAuthController {
  private readonly logger = new Logger(GoogleOAuthController.name)

  constructor(
    private readonly tokenService: IGoogleTokenService,
    private readonly config: ConfigService<Env, true>,
    private readonly recordingDetector: MeetingRecordingDetectorService,
    private readonly transcriptionPoller: MeetingTranscriptionPollerService,
  ) {}

  private createOAuthClient() {
    return new google.auth.OAuth2(
      this.config.get('GOOGLE_CLIENT_ID', { infer: true }),
      this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
      this.config.get('GOOGLE_REDIRECT_URI', { infer: true }),
    )
  }

  @Get('status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get Google connection status' })
  @ApiResponse({ status: 200, description: 'Returns connection status and email if connected' })
  async status() {
    const token = await this.tokenService.getToken()
    if (!token) return { connected: false }
    return { connected: true, email: token.email }
  }

  @Get('auth-url')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Return the Google OAuth consent URL (for frontend redirect)' })
  @ApiResponse({ status: 200, description: 'Returns { url }' })
  getAuthUrl() {
    const client = this.createOAuthClient()
    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    })
    return { url }
  }

  @Get('auth')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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

  // No auth guard — Google redirects here after OAuth consent
  @Get('callback')
  @ApiOperation({ summary: 'Google OAuth callback — exchanges code for token' })
  @ApiQuery({ name: 'code', required: true, description: 'Authorization code from Google' })
  @ApiResponse({ status: 302, description: 'Redirects to admin page on success' })
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

    this.logger.log(`Google account connected: ${data.email}`)
    return res.redirect('http://localhost:3000/admin/google?connected=1')
  }

  @Delete('disconnect')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect Google account' })
  @ApiResponse({ status: 204, description: 'Google account disconnected' })
  async disconnect() {
    await this.tokenService.deleteToken()
  }

  @Post('check-recordings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger recording detection job (external cron)' })
  @ApiQuery({ name: 'secret', required: true, description: 'CRON_SECRET value' })
  @ApiResponse({ status: 200, description: 'Job triggered successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or missing cron secret' })
  async checkRecordings(@Query('secret') secret: string) {
    const cronSecret = this.config.get('CRON_SECRET', { infer: true })
    if (!cronSecret || secret !== cronSecret) throw new UnauthorizedException('Invalid cron secret')
    await this.recordingDetector.run()
    return { ok: true }
  }

  @Post('check-transcriptions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger transcription polling job (external cron)' })
  @ApiQuery({ name: 'secret', required: true, description: 'CRON_SECRET value' })
  @ApiResponse({ status: 200, description: 'Job triggered successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or missing cron secret' })
  async checkTranscriptions(@Query('secret') secret: string) {
    const cronSecret = this.config.get('CRON_SECRET', { infer: true })
    if (!cronSecret || secret !== cronSecret) throw new UnauthorizedException('Invalid cron secret')
    await this.transcriptionPoller.pollTranscriptionJobs()
    return { ok: true }
  }
}
