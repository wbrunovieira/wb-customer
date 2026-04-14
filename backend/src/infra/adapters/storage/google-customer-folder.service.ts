import { Injectable, Logger } from '@nestjs/common'
import { google } from 'googleapis'
import { ConfigService } from '@nestjs/config'
import { ICustomerFolderService } from '@/domain/customers/application/services/i-customer-folder.service'
import { IGoogleTokenService } from '@/domain/meetings/application/services/i-google-token.service'
import { Env } from '@/env/env'

const ROOT_FOLDER_NAME = 'WB-Customer'
const DOCUMENTS_FOLDER_NAME = 'Documentos'

@Injectable()
export class GoogleCustomerFolderService implements ICustomerFolderService {
  private readonly logger = new Logger(GoogleCustomerFolderService.name)

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

  private async getOrCreateFolder(
    drive: ReturnType<typeof google.drive>,
    name: string,
    parentId?: string,
  ): Promise<string> {
    const q = parentId
      ? `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`

    const { data } = await drive.files.list({
      q,
      fields: 'files(id, name)',
      spaces: 'drive',
    })

    if (data.files && data.files.length > 0) {
      return data.files[0].id!
    }

    const { data: created } = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {}),
      },
      fields: 'id',
    })

    this.logger.log(`Created Drive folder: ${name} (${created.id})`)
    return created.id!
  }

  async createFolder(customerName: string): Promise<string> {
    const auth = await this.getAuthClient()
    const drive = google.drive({ version: 'v3', auth })

    // WB-Customer/Documentos/{customerName}/
    const rootId = await this.getOrCreateFolder(drive, ROOT_FOLDER_NAME)
    const docsId = await this.getOrCreateFolder(drive, DOCUMENTS_FOLDER_NAME, rootId)
    const customerFolderId = await this.getOrCreateFolder(drive, customerName, docsId)

    return customerFolderId
  }
}
