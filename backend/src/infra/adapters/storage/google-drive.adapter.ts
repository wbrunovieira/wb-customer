import { Injectable, Logger } from '@nestjs/common'
import { google } from 'googleapis'
import { ConfigService } from '@nestjs/config'
import {
  IStorageAdapter,
  UploadFileParams,
  UploadFileResult,
} from '@/domain/documents/application/services/i-storage.adapter'
import { IGoogleTokenService } from '@/domain/meetings/application/services/i-google-token.service'
import { Env } from '@/env/env'
import { Readable } from 'stream'

@Injectable()
export class GoogleDriveAdapter implements IStorageAdapter {
  private readonly logger = new Logger(GoogleDriveAdapter.name)

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
    if (!token) throw new Error('Google token not configured — connect Google account first')

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
      auth.setCredentials({
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
      })
    }

    return auth
  }

  async uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
    const auth = await this.getAuthClient()
    const drive = google.drive({ version: 'v3', auth })

    const stream = Readable.from(params.buffer)

    const { data } = await drive.files.create({
      requestBody: {
        name: params.fileName,
        parents: [params.folderId],
      },
      media: {
        mimeType: params.mimeType,
        body: stream,
      },
      fields: 'id, webViewLink, webContentLink',
    })

    // Make file readable by anyone with the link
    await drive.permissions.create({
      fileId: data.id!,
      requestBody: { role: 'reader', type: 'anyone' },
    })

    return {
      fileId: data.id!,
      viewUrl: data.webViewLink ?? `https://drive.google.com/file/d/${data.id}/view`,
      downloadUrl:
        data.webContentLink ??
        `https://drive.google.com/uc?export=download&id=${data.id}`,
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    const auth = await this.getAuthClient()
    const drive = google.drive({ version: 'v3', auth })

    try {
      await drive.files.delete({ fileId })
    } catch (err) {
      const status = (err as { code?: number }).code
      if (status === 404) return // Already gone
      this.logger.warn(`Failed to delete Drive file ${fileId}: ${err}`)
      throw err
    }
  }
}
