import { Injectable } from '@nestjs/common'
import { Either, right } from '@/core/either'
import { ISocialEngineGateway } from '../gateways/i-social-engine.gateway'
import {
  ISocialPublicationRepository,
  ReconcilableTarget,
} from '../repositories/i-social-publication.repository'

export interface ReconcileSocialPublicationsRequest {
  /** Costura de teste; em produção é o relógio. */
  now?: Date
}

export interface StateTransition {
  publicationId: string
  customerId: string
  postizPostId: string
  provider: string
  from: string
  to: string
  failureReason: string | null
  publishedUrl: string | null
}

export interface ReconcileSocialPublicationsResponse {
  /** Quantos destinos foram conferidos nesta passada. */
  checked: number
  /** Só o que mudou de estado — é isso que merece virar aviso. */
  transitions: StateTransition[]
}

export type ReconcileSocialPublicationsResult = Either<
  never,
  ReconcileSocialPublicationsResponse
>

/** Margem em torno da data agendada ao perguntar a fila ao motor. */
const WINDOW_DAYS = 7
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Pergunta ao motor o que aconteceu com o que mandamos publicar.
 *
 * Existe porque o motor não avisa quando falha: o webhook dele dispara só
 * depois de publicar com sucesso, e todo caminho de erro retorna antes. Então
 * uma publicação que falhou às 9h da terça só é conhecida se alguém for lá
 * perguntar — e é isso que este caso de uso faz.
 *
 * Não conhece notificação de propósito: devolve as transições e quem avisa é a
 * infraestrutura. O domínio não precisa saber que existe um sino na tela.
 */
@Injectable()
export class ReconcileSocialPublicationsUseCase {
  constructor(
    private readonly publications: ISocialPublicationRepository,
    private readonly engine: ISocialEngineGateway,
  ) {}

  async execute(
    req: ReconcileSocialPublicationsRequest = {},
  ): Promise<ReconcileSocialPublicationsResult> {
    if (!(await this.engine.isConfigured())) {
      return right({ checked: 0, transitions: [] })
    }

    const now = req.now ?? new Date()
    const pending = await this.publications.findTargetsToReconcile()
    if (pending.length === 0) return right({ checked: 0, transitions: [] })

    const transitions: StateTransition[] = []

    // Uma consulta por grupo, não por destino: o teto do motor é de 90
    // requisições por hora, e um destino por chamada estouraria isso no
    // primeiro cliente com um mês de calendário.
    for (const [groupId, targets] of groupByGroup(pending)) {
      const { from, to } = windowFor(targets)
      const queue = await this.engine.listQueue({ groupId, from, to })
      const byId = new Map(queue.map((p) => [p.id, p]))

      for (const target of targets) {
        const found = byId.get(target.postizPostId)

        // Some da fila = o post não existe mais no motor: apagado por lá, ou
        // fora da janela. Não é desfecho, então fica como está para a próxima
        // passada em vez de virar falha inventada.
        if (!found) continue
        if (found.state === target.state) continue

        await this.publications.updateTargetState({
          postizPostId: target.postizPostId,
          state: found.state,
          failureReason: found.state === 'ERROR' ? 'O motor marcou o post como falho.' : null,
          publishedUrl: found.url,
          checkedAt: now,
        })

        transitions.push({
          publicationId: target.publicationId,
          customerId: target.customerId,
          postizPostId: target.postizPostId,
          provider: target.provider,
          from: target.state,
          to: found.state,
          failureReason: found.state === 'ERROR' ? 'O motor marcou o post como falho.' : null,
          publishedUrl: found.url,
        })
      }
    }

    return right({ checked: pending.length, transitions })
  }
}

function groupByGroup(targets: ReconcilableTarget[]): Map<string, ReconcilableTarget[]> {
  const byGroup = new Map<string, ReconcilableTarget[]>()
  for (const target of targets) {
    byGroup.set(target.postizGroupId, [
      ...(byGroup.get(target.postizGroupId) ?? []),
      target,
    ])
  }
  return byGroup
}

/** Janela que cobre todos os destinos do grupo, com folga dos dois lados. */
function windowFor(targets: ReconcilableTarget[]): { from: Date; to: Date } {
  const times = targets.map((t) => t.scheduledFor.getTime())
  return {
    from: new Date(Math.min(...times) - WINDOW_DAYS * MS_PER_DAY),
    to: new Date(Math.max(...times) + WINDOW_DAYS * MS_PER_DAY),
  }
}
