import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Env } from '@/env/env'

export interface SendTextResult {
  messageId: string
}

export interface MediaBase64Result {
  base64: string
  mimetype: string
  fileName?: string
}

@Injectable()
export class EvolutionApiClient {
  private readonly logger = new Logger(EvolutionApiClient.name)

  constructor(private readonly config: ConfigService<Env, true>) {}

  private get baseUrl(): string {
    return this.config.get('EVOLUTION_API_URL', { infer: true }) ?? ''
  }

  private get instance(): string {
    return this.config.get('EVOLUTION_INSTANCE', { infer: true }) ?? ''
  }

  private get apiKey(): string {
    return this.config.get('EVOLUTION_API_KEY', { infer: true }) ?? ''
  }

  async sendText(to: string, text: string): Promise<SendTextResult | null> {
    try {
      const resp = await fetch(
        `${this.baseUrl}/message/sendText/${this.instance}`,
        {
          method: 'POST',
          headers: {
            apikey: this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ number: to, text }),
        },
      )

      if (!resp.ok) {
        this.logger.warn(`Evolution sendText ${resp.status} to ${to}`)
        return null
      }

      const data = (await resp.json()) as { key?: { id?: string } }
      return { messageId: data.key?.id ?? '' }
    } catch (err) {
      this.logger.error(`Evolution sendText error: ${err}`)
      return null
    }
  }

  async getBase64FromMedia(messageId: string, remoteJid: string): Promise<MediaBase64Result | null> {
    try {
      const resp = await fetch(
        `${this.baseUrl}/chat/getBase64FromMediaMessage/${this.instance}`,
        {
          method: 'POST',
          headers: {
            apikey: this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: { key: { id: messageId, remoteJid } } }),
        },
      )

      if (!resp.ok) {
        this.logger.warn(`Evolution getBase64 ${resp.status} for ${messageId}`)
        return null
      }

      const data = (await resp.json()) as MediaBase64Result
      return data
    } catch (err) {
      this.logger.error(`Evolution getBase64 error: ${err}`)
      return null
    }
  }
}
