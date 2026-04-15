import { Injectable, Logger } from '@nestjs/common'
import { IGoogleTokenService } from '@/domain/meetings/application/services/i-google-token.service'
import { google, gmail_v1 } from 'googleapis'

export interface EmailMessage {
  messageId: string
  threadId: string
  fromAddress: string
  fromName: string
  subject: string
  bodyText: string
  receivedAt: Date
}

export interface SendEmailRequest {
  to: string[]
  cc?: string[]
  subject: string
  htmlBody: string
  threadId?: string
  attachments?: Array<{ fileName: string; mimeType: string; buffer: Buffer }>
}

export interface SendEmailResult {
  messageId: string
  threadId: string
}

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name)

  constructor(private readonly tokenService: IGoogleTokenService) {}

  private async getClient() {
    const token = await this.tokenService.getToken()
    if (!token) throw new Error('Google token not configured — connect Google first')

    const auth = new google.auth.OAuth2()
    auth.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expiry_date: token.expiresAt.getTime(),
    })
    return google.gmail({ version: 'v1', auth })
  }

  /**
   * Poll Gmail inbox for new messages since the given historyId.
   * Returns new email messages and the updated historyId.
   */
  async pollInbox(
    lastHistoryId: string | null,
  ): Promise<{ messages: EmailMessage[]; nextHistoryId: string | null }> {
    const gmail = await this.getClient()

    // On first poll, get the profile to get the current historyId
    if (!lastHistoryId) {
      const profile = await gmail.users.getProfile({ userId: 'me' })
      return {
        messages: [],
        nextHistoryId: profile.data.historyId ?? null,
      }
    }

    const historyResp = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: lastHistoryId,
      labelId: 'INBOX',
      historyTypes: ['messageAdded'],
    })

    const historyList = historyResp.data.history ?? []
    const nextHistoryId = historyResp.data.historyId ?? lastHistoryId

    const messages: EmailMessage[] = []

    for (const entry of historyList) {
      for (const added of entry.messagesAdded ?? []) {
        const msgId = added.message?.id
        if (!msgId) continue

        try {
          const msg = await this.fetchMessage(gmail, msgId)
          if (msg) messages.push(msg)
        } catch (err) {
          this.logger.warn(`Failed to fetch Gmail message ${msgId}: ${err}`)
        }
      }
    }

    return { messages, nextHistoryId }
  }

  private async fetchMessage(
    gmail: gmail_v1.Gmail,
    messageId: string,
  ): Promise<EmailMessage | null> {
    const resp = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    })

    const data = resp.data
    if (!data.payload) return null

    const headers = data.payload.headers ?? []
    const get = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

    const fromRaw = get('From') // "Name <email@example.com>" or "email@example.com"
    const { name: fromName, email: fromAddress } = this.parseFrom(fromRaw)
    const subject = get('Subject')
    const threadId = data.threadId ?? messageId
    const date = get('Date')
    const receivedAt = date ? new Date(date) : new Date()

    const bodyText = this.extractBody(data.payload)

    return { messageId, threadId, fromAddress, fromName, subject, bodyText, receivedAt }
  }

  async sendEmail(req: SendEmailRequest): Promise<SendEmailResult> {
    const gmail = await this.getClient()
    const raw = this.buildMimeMessage(req)

    const resp = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
        ...(req.threadId ? { threadId: req.threadId } : {}),
      },
    })

    return {
      messageId: resp.data.id ?? '',
      threadId: resp.data.threadId ?? '',
    }
  }

  private buildMimeMessage(req: SendEmailRequest): string {
    const boundary = `boundary_${Date.now()}`
    const hasAttachments = (req.attachments?.length ?? 0) > 0

    const toHeader = req.to.join(', ')
    const ccHeader = req.cc?.length ? `Cc: ${req.cc.join(', ')}\r\n` : ''
    const headers =
      `To: ${toHeader}\r\n` +
      ccHeader +
      `Subject: ${req.subject}\r\n` +
      `MIME-Version: 1.0\r\n`

    let body: string
    if (!hasAttachments) {
      body =
        headers +
        `Content-Type: text/html; charset="UTF-8"\r\n\r\n` +
        req.htmlBody
    } else {
      const parts = [
        `--${boundary}\r\n` +
        `Content-Type: text/html; charset="UTF-8"\r\n\r\n` +
        req.htmlBody + '\r\n',
        ...(req.attachments ?? []).map((att) => {
          const b64 = att.buffer.toString('base64')
          return (
            `--${boundary}\r\n` +
            `Content-Type: ${att.mimeType}; name="${att.fileName}"\r\n` +
            `Content-Disposition: attachment; filename="${att.fileName}"\r\n` +
            `Content-Transfer-Encoding: base64\r\n\r\n` +
            b64 + '\r\n'
          )
        }),
        `--${boundary}--`,
      ]
      body =
        headers +
        `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n` +
        parts.join('')
    }

    return Buffer.from(body).toString('base64url')
  }

  private parseFrom(from: string): { name: string; email: string } {
    const match = from.match(/^(.+?)\s*<(.+?)>$/)
    if (match) return { name: match[1].trim(), email: match[2].trim() }
    return { name: '', email: from.trim() }
  }

  private extractBody(payload: gmail_v1.Schema$MessagePart): string {
    if (payload.mimeType === 'text/html' && payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8')
    }
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8')
    }
    for (const part of payload.parts ?? []) {
      const text = this.extractBody(part)
      if (text) return text
    }
    return ''
  }
}
