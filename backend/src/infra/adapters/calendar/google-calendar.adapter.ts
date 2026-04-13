import { Injectable, Logger } from '@nestjs/common'
import { google } from 'googleapis'
import { v4 as uuidv4 } from 'uuid'
import {
  ICalendarAdapter,
  CreateEventParams,
  CreateEventResult,
} from '@/domain/meetings/application/services/i-calendar.adapter'
import { IGoogleTokenService } from '@/domain/meetings/application/services/i-google-token.service'
import { MeetAttendee } from '@/domain/meetings/enterprise/entities/meeting'
import { ConfigService } from '@nestjs/config'
import { Env } from '@/env/env'

@Injectable()
export class GoogleCalendarAdapter implements ICalendarAdapter {
  private readonly logger = new Logger(GoogleCalendarAdapter.name)

  constructor(
    private readonly tokenService: IGoogleTokenService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private async getAuthClient() {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', { infer: true })
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET', { infer: true })
    const redirectUri = this.config.get('GOOGLE_REDIRECT_URI', { infer: true })

    const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

    const token = await this.tokenService.getToken()
    if (!token) throw new Error('Google token not configured')

    if (this.tokenService.isTokenExpired(token)) {
      auth.setCredentials({ refresh_token: token.refreshToken })
      const { credentials } = await auth.refreshAccessToken()
      await this.tokenService.saveToken({
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token ?? token.refreshToken,
        expiresAt: new Date(credentials.expiry_date!),
        scope: credentials.scope ?? token.scope,
        email: token.email,
      })
      auth.setCredentials(credentials)
    } else {
      auth.setCredentials({ access_token: token.accessToken, refresh_token: token.refreshToken })
    }

    return auth
  }

  private mapAttendees(raw: { email?: string | null; responseStatus?: string | null; organizer?: boolean | null; self?: boolean | null }[]): MeetAttendee[] {
    return raw.map((a) => ({
      email: a.email!,
      responseStatus: (a.responseStatus ?? 'needsAction') as MeetAttendee['responseStatus'],
      organizer: a.organizer ?? false,
      self: a.self ?? false,
    }))
  }

  async createEvent(params: CreateEventParams): Promise<CreateEventResult> {
    const auth = await this.getAuthClient()
    const calendar = google.calendar({ version: 'v3', auth })
    const tz = params.timeZone ?? 'America/Sao_Paulo'

    const { data } = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      sendUpdates: 'all',
      requestBody: {
        summary: params.title,
        description: params.description,
        start: { dateTime: params.startAt.toISOString(), timeZone: tz },
        end: { dateTime: params.endAt.toISOString(), timeZone: tz },
        attendees: params.attendeeEmails.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: uuidv4(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    })

    return {
      googleEventId: data.id!,
      meetLink: data.hangoutLink ?? null,
      attendees: this.mapAttendees(data.attendees ?? []),
    }
  }

  async updateEvent(
    googleEventId: string,
    params: Partial<CreateEventParams>,
  ): Promise<{ attendees: MeetAttendee[] }> {
    const auth = await this.getAuthClient()
    const calendar = google.calendar({ version: 'v3', auth })
    const tz = params.timeZone ?? 'America/Sao_Paulo'

    const requestBody: Record<string, unknown> = {}
    if (params.title) requestBody['summary'] = params.title
    if (params.description !== undefined) requestBody['description'] = params.description
    if (params.startAt) requestBody['start'] = { dateTime: params.startAt.toISOString(), timeZone: tz }
    if (params.endAt) requestBody['end'] = { dateTime: params.endAt.toISOString(), timeZone: tz }
    if (params.attendeeEmails) requestBody['attendees'] = params.attendeeEmails.map((email) => ({ email }))

    const { data } = await calendar.events.patch({
      calendarId: 'primary',
      eventId: googleEventId,
      sendUpdates: 'all',
      requestBody,
    })

    return { attendees: this.mapAttendees(data.attendees ?? []) }
  }

  async cancelEvent(googleEventId: string): Promise<void> {
    const auth = await this.getAuthClient()
    const calendar = google.calendar({ version: 'v3', auth })

    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: googleEventId,
        sendUpdates: 'all',
      })
    } catch (err) {
      if ((err as { code?: number }).code === 404) return
      throw err
    }
  }

  async getEvent(googleEventId: string) {
    const auth = await this.getAuthClient()
    const calendar = google.calendar({ version: 'v3', auth })

    const { data } = await calendar.events.get({
      calendarId: 'primary',
      eventId: googleEventId,
    })

    return {
      googleEventId: data.id!,
      attendees: this.mapAttendees(data.attendees ?? []),
    }
  }
}
