import { Injectable, Logger } from '@nestjs/common'
import { google } from 'googleapis'
import { ConfigService } from '@nestjs/config'
import { IGoogleTokenService } from '@/domain/meetings/application/services/i-google-token.service'
import { Env } from '@/env/env'

export interface MeetingRecordingFile {
  fileId: string
  webViewLink: string
}

export interface MeetingFiles {
  recording: MeetingRecordingFile | null
  /** Google Meet native transcript / Gemini doc saved to Drive */
  nativeTranscript: MeetingRecordingFile | null
}

@Injectable()
export class MeetingFilesFinderService {
  private readonly logger = new Logger(MeetingFilesFinderService.name)

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

  /**
   * Searches "Meet Recordings" folder for files created after a given date.
   * Returns a map of lowercased title prefix → list of files.
   * Used by Pass 0 (Drive-first detection).
   */
  async listRecentDriveFiles(since: Date): Promise<{ id: string; name: string; mimeType: string; createdTime: string }[]> {
    const auth = await this.getAuthClient()
    const drive = google.drive({ version: 'v3', auth })

    const folderRes = await drive.files.list({
      q: `name = 'Meet Recordings' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
      pageSize: 1,
    })
    const meetFolder = folderRes.data.files?.[0]
    if (!meetFolder) return []

    const res = await drive.files.list({
      q: `'${meetFolder.id}' in parents and trashed = false and createdTime > '${since.toISOString()}'`,
      fields: 'files(id, name, mimeType, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 50,
    })

    return (res.data.files ?? []) as { id: string; name: string; mimeType: string; createdTime: string }[]
  }

  /**
   * Finds recording (.mp4) and native transcript (Google Doc) for a meeting
   * by searching in "Meet Recordings" folder for files created after scheduledStartAt - 2h.
   */
  async findMeetingFiles(meetingTitle: string, scheduledStartAt: Date): Promise<MeetingFiles> {
    const auth = await this.getAuthClient()
    const drive = google.drive({ version: 'v3', auth })

    const folderRes = await drive.files.list({
      q: `name = 'Meet Recordings' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
      pageSize: 1,
    })
    const meetFolder = folderRes.data.files?.[0]

    const minTime = new Date(scheduledStartAt.getTime() - 2 * 60 * 60 * 1000).toISOString()
    const folderFilter = meetFolder ? `'${meetFolder.id}' in parents and` : ''

    const res = await drive.files.list({
      q: `${folderFilter} trashed = false and createdTime > '${minTime}'`,
      fields: 'files(id, name, webViewLink, createdTime, mimeType)',
      orderBy: 'createdTime desc',
      pageSize: 30,
    })

    const files = res.data.files ?? []
    const titleLower = meetingTitle.toLowerCase()
    const titleMatches = files.filter((f) => f.name?.toLowerCase().startsWith(titleLower))
    const candidates = titleMatches.length > 0 ? titleMatches : files

    const recording = candidates.find((f) => f.mimeType === 'video/mp4') ?? null
    const nativeTranscript =
      candidates.find(
        (f) =>
          f.mimeType === 'application/vnd.google-apps.document' ||
          f.mimeType === 'text/plain',
      ) ?? null

    return {
      recording: recording ? { fileId: recording.id!, webViewLink: recording.webViewLink! } : null,
      nativeTranscript: nativeTranscript
        ? { fileId: nativeTranscript.id!, webViewLink: nativeTranscript.webViewLink! }
        : null,
    }
  }

  /**
   * Exports a Google Doc as plain text (used for native Meet transcripts / Gemini notes).
   */
  async exportGoogleDocText(fileId: string): Promise<string> {
    const auth = await this.getAuthClient()
    const drive = google.drive({ version: 'v3', auth })
    const res = await drive.files.export(
      { fileId, mimeType: 'text/plain' },
      { responseType: 'arraybuffer' },
    )
    return Buffer.from(res.data as ArrayBuffer).toString('utf-8').trim()
  }

  /**
   * Downloads a Drive file as Buffer (used to submit recording to transcriptor).
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    const auth = await this.getAuthClient()
    const drive = google.drive({ version: 'v3', auth })
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' },
    )
    return Buffer.from(res.data as ArrayBuffer)
  }

  /**
   * Parses the exported Google Meet Gemini doc into summary and raw transcript.
   * The doc format:
   *   📝 Observações / summary section
   *   📖 Transcrição / raw transcript section (only if user enabled it)
   */
  parseGoogleMeetDoc(text: string): { summary: string | null; transcript: string | null } {
    const idx = text.indexOf('📖')
    if (idx === -1) {
      return { summary: text.trim() || null, transcript: null }
    }
    return {
      summary: text.slice(0, idx).trim() || null,
      transcript: text.slice(idx).trim() || null,
    }
  }
}
