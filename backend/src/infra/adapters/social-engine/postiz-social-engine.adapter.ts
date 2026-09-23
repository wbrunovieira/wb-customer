import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Env } from '@/env/env'
import { ISocialEngineConfigRepository } from '@/domain/social/application/repositories/i-social-engine-config.repository'
import {
  ISocialEngineGateway,
  ListQueueInput,
  PostMetrics,
  PublishInput,
  UploadMediaInput,
  UploadedMedia,
  PublishedTarget,
  QueuedPost,
  SocialChannel,
  SocialGroup,
} from '@/domain/social/application/gateways/i-social-engine.gateway'

/** Forma devolvida por GET /api/public/v1/groups. */
interface PostizGroup {
  id: string
  name: string
}

/**
 * Item de GET /api/public/v1/analytics/post/:postId. O motor devolve uma série
 * por data; para um post ele traz um ponto por métrica.
 */
interface PostizAnalytics {
  label: string
  data?: { total: string; date: string }[]
  percentageChange?: number
}

/** Item de GET /api/public/v1/posts. */
interface PostizQueuedPost {
  id: string
  content: string
  publishDate: string
  state: string
  releaseURL?: string | null
  group?: string | null
  integration?: {
    id: string
    name: string
    providerIdentifier: string
  } | null
}

/** Forma devolvida por POST /api/public/v1/posts: um item por canal. */
interface PostizCreatedPost {
  postId: string
  /** O motor devolve aqui o id do canal, com o nome 'integration'. */
  integration: string
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

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly configRepo: ISocialEngineConfigRepository,
  ) {}

  /**
   * Banco primeiro, .env como fallback de bootstrap.
   *
   * A ordem importa. O .env é o que existe antes de alguém conseguir cadastrar
   * qualquer coisa; o banco é o que um agente consegue escrever pela API. Se o
   * env ganhasse, um cadastro feito pela API seria ignorado em silêncio num
   * servidor que ainda tivesse a variável antiga — e a pessoa veria a chave
   * cadastrada na tela enquanto o motor continuava usando outra.
   *
   * Um erro do banco sobe em vez de virar fallback: cair no .env quando o banco
   * está fora esconderia a causa e publicaria com credencial que ninguém
   * escolheu.
   */
  private async creds(): Promise<{ baseUrl: string; apiKey: string }> {
    const gravado = await this.configRepo.find()

    const url =
      gravado?.apiUrl ?? this.config.get('POSTIZ_API_URL', { infer: true }) ?? ''
    const key =
      gravado?.apiKey ?? this.config.get('POSTIZ_API_KEY', { infer: true }) ?? ''

    return { baseUrl: url.replace(/\/+$/, ''), apiKey: key }
  }

  async isConfigured(): Promise<boolean> {
    const { baseUrl, apiKey } = await this.creds()
    return Boolean(baseUrl && apiKey)
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

  async publish(input: PublishInput): Promise<PublishedTarget[]> {
    const body = {
      type: input.mode,
      date: input.date.toISOString(),
      // Falso de propósito: encurtar reescreveria o wa.me e levaria embora o
      // marcador de atribuição que viaja dentro dele.
      shortLink: false,
      tags: [],
      posts: input.channels.map((channel) => ({
        integration: { id: channel.id },
        value: [
          {
            content: input.content,
            // O motor espera { id, path } por item; o path é o que ele mesmo
            // devolveu no upload.
            image: (input.media ?? []).map((m) => ({ id: m.id, path: m.path })),
          },
        ],
        settings: settingsFor(channel.provider),
      })),
    }

    const created = await this.post<PostizCreatedPost[]>('posts', body)

    return created.map((c) => ({ channelId: c.integration, postId: c.postId }))
  }

  async listQueue(input: ListQueueInput): Promise<QueuedPost[]> {
    const params = new URLSearchParams({
      startDate: input.from.toISOString(),
      endDate: input.to.toISOString(),
    })
    // No motor o parâmetro chama 'customer' e filtra pelo grupo do cliente.
    if (input.groupId) params.set('customer', input.groupId)

    const res = await this.get<{ posts: PostizQueuedPost[] }>(`posts?${params}`)

    return (res.posts ?? []).map((p) => ({
      id: p.id,
      content: stripHtml(p.content ?? ''),
      publishAt: new Date(p.publishDate),
      state: p.state,
      url: p.releaseURL ?? null,
      channelId: p.integration?.id ?? '',
      channelName: p.integration?.name ?? '',
      provider: p.integration?.providerIdentifier ?? 'desconhecido',
      group: p.group ?? null,
    }))
  }

  async uploadMedia(input: UploadMediaInput): Promise<UploadedMedia> {
    const form = new FormData()
    form.append(
      'file',
      new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }),
      input.fileName,
    )

    // Sem Content-Type à mão de propósito: o fetch precisa gerar o boundary do
    // multipart, e fixar o cabeçalho aqui quebraria o corpo.
    const { baseUrl, apiKey } = await this.creds()
    const resp = await fetch(`${baseUrl}/api/public/v1/upload`, {
      method: 'POST',
      headers: { Authorization: apiKey },
      body: form,
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      this.logger.error(`Postiz POST upload → ${resp.status} ${text.slice(0, 300)}`)
      throw new Error(`Postiz respondeu ${resp.status} ao subir a mídia: ${text.slice(0, 300)}`)
    }

    const media = (await resp.json()) as { id: string; path: string }
    return { id: media.id, path: media.path }
  }

  async getPostMetrics(postId: string, days: number): Promise<PostMetrics> {
    const res = await this.get<PostizAnalytics[] | { missing: true }>(
      `analytics/post/${encodeURIComponent(postId)}?date=${days}`,
    )

    // O motor responde { missing: true } quando perdeu o id do post na rede, e
    // [] quando o post não publicou ou a rede não expõe métrica. Nos dois casos
    // não há número para mostrar, e inventar zero seria mentir.
    if (!Array.isArray(res) || res.length === 0) {
      return { available: false, metrics: [] }
    }

    return {
      available: true,
      metrics: res.map((a) => ({
        label: a.label,
        total: Number(a.data?.[a.data.length - 1]?.total ?? 0),
        percentageChange: a.percentageChange ?? 0,
      })),
    }
  }

  async cancelPost(postId: string): Promise<void> {
    await this.request('DELETE', `posts/${encodeURIComponent(postId)}`)
  }

  private async get<T>(path: string): Promise<T> {
    const { baseUrl, apiKey } = await this.creds()
    const resp = await fetch(`${baseUrl}/api/public/v1/${path}`, {
      headers: { Authorization: apiKey },
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

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  private async request<T>(
    method: 'POST' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const { baseUrl, apiKey } = await this.creds()
    const resp = await fetch(`${baseUrl}/api/public/v1/${path}`, {
      method,
      headers: {
        Authorization: apiKey,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      this.logger.error(`Postiz ${method} ${path} → ${resp.status} ${text.slice(0, 300)}`)
      // A mensagem do motor entra na exceção: quando ele reprova o post por
      // regra da rede (legenda longa demais, formato inválido), quem chamou
      // precisa ler o motivo, não um 500 mudo.
      throw new Error(`Postiz respondeu ${resp.status} em ${path}: ${text.slice(0, 300)}`)
    }

    const text = await resp.text()
    return (text ? JSON.parse(text) : undefined) as T
  }
}

/**
 * Post nascido na tela do motor vem com HTML. Renderizar marcação vinda de fora
 * seria porta de injeção, e a agenda só precisa do texto.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

/**
 * Configurações do post por rede.
 *
 * O motor preenche __type com o provedor do canal e valida este objeto contra o
 * DTO daquela rede. O Instagram declara post_type como obrigatório; Facebook e
 * LinkedIn declaram tudo opcional. Mandar {} para todos fazia o Instagram — a
 * rede principal — recusar o post na validação, com 400 e sem explicação óbvia.
 *
 * post_type aceita só 'post' ou 'story'. Reel não é um valor: no Instagram,
 * vídeo vertical vira Reel por decisão da própria rede.
 */
function settingsFor(provider: string): Record<string, unknown> {
  if (provider === 'instagram') return { post_type: 'post' }
  return {}
}
