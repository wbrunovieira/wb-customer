import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Env } from '@/env/env'
import {
  ISocialEngineGateway,
  SocialChannel,
  SocialGroup,
} from '@/domain/social/application/gateways/i-social-engine.gateway'

/** Forma devolvida por GET /api/public/v1/groups. */
interface PostizGroup {
  id: string
  name: string
}

/** Forma devolvida por GET /api/public/v1/integrations. */
interface PostizIntegration {
  id: string
  name: string
  identifier: string
  picture?: string | null
  disabled: boolean
  profile?: string | null
  customer?: { id: string; name: string }
}

/**
 * Fala com o Postiz pela API pública, e só por ela. O Postiz é AGPL: consumir
 * por HTTP mantém o wb-customer separado, copiar código dele não manteria.
 */
@Injectable()
export class PostizSocialEngineAdapter implements ISocialEngineGateway {
  private readonly logger = new Logger(PostizSocialEngineAdapter.name)

  constructor(private readonly config: ConfigService<Env, true>) {}

  private get baseUrl(): string {
    const url = this.config.get('POSTIZ_API_URL', { infer: true }) ?? ''
    return url.replace(/\/+$/, '')
  }

  private get apiKey(): string {
    return this.config.get('POSTIZ_API_KEY', { infer: true }) ?? ''
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.apiKey)
  }

  async listGroups(): Promise<SocialGroup[]> {
    const groups = await this.get<PostizGroup[]>('groups')
    return groups.map((g) => ({ id: g.id, name: g.name }))
  }

  async listChannels(): Promise<SocialChannel[]> {
    const integrations = await this.get<PostizIntegration[]>('integrations')

    return integrations.map((i) => ({
      id: i.id,
      name: i.name,
      // No Postiz o campo chama identifier; aqui é provider, que é o nome do
      // que ele guarda: instagram, facebook, linkedin…
      provider: i.identifier,
      disabled: i.disabled,
      // customer ausente = canal conectado mas sem cliente nomeado.
      groupId: i.customer?.id ?? null,
    }))
  }

  private async get<T>(path: string): Promise<T> {
    const resp = await fetch(`${this.baseUrl}/api/public/v1/${path}`, {
      headers: { Authorization: this.apiKey },
    })

    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      this.logger.error(`Postiz GET ${path} → ${resp.status} ${body.slice(0, 200)}`)
      // Estourar é proposital: devolver lista vazia num fora do ar faria a tela
      // dizer "nenhum canal", que é indistinguível de canal nenhum conectado.
      throw new Error(`Postiz respondeu ${resp.status} em ${path}`)
    }

    return (await resp.json()) as T
  }
}
