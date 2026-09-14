import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ISocialEngineGateway, PostMetric } from '../gateways/i-social-engine.gateway'
import { ISocialPublicationRepository } from '../repositories/i-social-publication.repository'
import { ISocialPostMetricRepository } from '../repositories/i-social-post-metric.repository'

export interface SyncSocialMetricsRequest {
  /** Quantos dias para trás recoletar. Padrão 7. */
  days?: number
  /** Teto de posts por passada, por causa do limite do motor. Padrão 60. */
  limit?: number
  now?: Date
}

export interface SyncSocialMetricsResponse {
  /** Quantos posts foram perguntados. */
  asked: number
  /** Quantos tinham número para guardar. */
  collected: number
  /** Quantos a rede não informou — ausência de dado, não zero. */
  unavailable: number
}

export type SyncSocialMetricsResult = Either<never, SyncSocialMetricsResponse>

const DEFAULT_DAYS = 7
const DEFAULT_LIMIT = 60
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Rótulos que o motor devolve, vindos de cada rede, mapeados para coluna.
 * O que não estiver aqui continua vivo em `raw`.
 */
const LABEL_TO_FIELD: Record<string, keyof CollectedNumbers> = {
  views: 'views',
  reach: 'reach',
  likes: 'likes',
  comments: 'comments',
  shares: 'shares',
  saved: 'saves',
  saves: 'saves',
}

interface CollectedNumbers {
  views: number | null
  reach: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
}

/**
 * Traz para cá o número dos posts que saíram.
 *
 * Sob demanda já existia (uma chamada por clique), mas isso não constrói série
 * histórica nem alimenta comparação: para saber se a cadência está funcionando
 * é preciso ter os números guardados, não buscáveis.
 *
 * Recoleta os últimos dias em vez de só o dia anterior, porque algumas métricas
 * demoram a estabilizar — congelar o número de ontem seria guardar um valor que
 * ainda ia mudar.
 */
@Injectable()
export class SyncSocialMetricsUseCase {
  constructor(
    private readonly publications: ISocialPublicationRepository,
    private readonly metrics: ISocialPostMetricRepository,
    private readonly engine: ISocialEngineGateway,
  ) {}

  async execute(req: SyncSocialMetricsRequest = {}): Promise<SyncSocialMetricsResult> {
    if (!this.engine.isConfigured()) {
      return right({ asked: 0, collected: 0, unavailable: 0 })
    }

    const now = req.now ?? new Date()
    const days = req.days ?? DEFAULT_DAYS
    const since = new Date(now.getTime() - days * MS_PER_DAY)

    const targets = await this.publications.findPublishedTargetsSince(
      since,
      req.limit ?? DEFAULT_LIMIT,
    )

    let collected = 0
    let unavailable = 0

    // Em série: o motor aceita 90 requisições por hora e esta passada é uma por
    // post. Disparar tudo junto trocaria a coleta inteira por metade dela.
    for (const target of targets) {
      const result = await this.engine.getPostMetrics(target.postizPostId, days)

      // Nada a guardar. Gravar uma linha de nulos faria "não medido" parecer
      // "medido e deu zero".
      if (!result.available || result.metrics.length === 0) {
        unavailable += 1
        continue
      }

      await this.metrics.upsert({
        postizPostId: target.postizPostId,
        customerId: target.customerId,
        provider: target.provider,
        ...toNumbers(result.metrics),
        raw: result.metrics,
        collectedAt: now,
      })
      collected += 1
    }

    return right({ asked: targets.length, collected, unavailable })
  }
}

function toNumbers(metrics: PostMetric[]): CollectedNumbers {
  const numbers: CollectedNumbers = {
    views: null,
    reach: null,
    likes: null,
    comments: null,
    shares: null,
    saves: null,
  }

  for (const metric of metrics) {
    const field = LABEL_TO_FIELD[metric.label.trim().toLowerCase()]
    if (field) numbers[field] = metric.total
  }

  return numbers
}
