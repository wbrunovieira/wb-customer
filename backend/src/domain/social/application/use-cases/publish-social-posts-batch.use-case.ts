import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { CustomerNotLinkedToGroupError } from '../../domain/exceptions/customer-not-linked-to-group.error'
import { RuleViolation } from '../services/content-rules'
import { ContentRulesViolationError } from '../../domain/exceptions/content-rules-violation.error'
import { EmptyBatchError } from '../../domain/exceptions/empty-batch.error'
import {
  BatchTooLargeError,
  MAX_BATCH_REQUESTS,
} from '../../domain/exceptions/batch-too-large.error'
import {
  PublishSocialPostRequest,
  PublishSocialPostUseCase,
} from './publish-social-post.use-case'

export type BatchItem = Omit<
  PublishSocialPostRequest,
  'customerId' | 'createdByUserId' | 'now'
>

export interface PublishSocialPostsBatchRequest {
  customerId: string
  items: BatchItem[]
  createdByUserId: string
  now?: Date
}

export interface BatchItemResult {
  /** Posição no lote enviado. É por ela que quem chamou reencontra o item. */
  index: number
  status: 'scheduled' | 'rejected'
  publicationId?: string
  scheduledFor?: Date
  targets?: { channelId: string; provider: string; postizPostId: string }[]
  error?: string
  /** Presente quando a recusa veio das regras da casa. */
  violations?: RuleViolation[]
}

export interface PublishSocialPostsBatchResponse {
  total: number
  scheduled: number
  rejected: number
  results: BatchItemResult[]
}

export type PublishSocialPostsBatchResult = Either<
  | EmptyBatchError
  | BatchTooLargeError
  | CustomerNotFoundError
  | CustomerNotLinkedToGroupError,
  PublishSocialPostsBatchResponse
>

/**
 * Agenda o calendário editorial de uma vez.
 *
 * O mês tem cerca de 32 publicações. Cadastrar uma a uma na tela é trabalho
 * suficiente para a pessoa desistir e voltar ao Business Suite — e como agentes
 * operam este sistema, montar o mês inteiro numa chamada é o caso de uso real.
 *
 * Um item ruim NÃO derruba o lote. Recusar trinta e dois posts por causa de um
 * travessão no décimo quarto seria transformar um erro de digitação em uma
 * tarde perdida. Cada item é conferido e publicado por conta própria, e a
 * resposta diz, item a item, o que entrou e o que não entrou.
 */
@Injectable()
export class PublishSocialPostsBatchUseCase {
  constructor(
    private readonly publish: PublishSocialPostUseCase,
    private readonly customers: ICustomerRepository,
  ) {}

  async execute(
    req: PublishSocialPostsBatchRequest,
  ): Promise<PublishSocialPostsBatchResult> {
    if (req.items.length === 0) return left(new EmptyBatchError())

    // Medido em requisições e não em posts: com carrossel, um post custa uma
    // chamada mais uma por imagem, e contar posts esconderia o custo real.
    const requests = req.items.reduce((sum, item) => sum + engineCost(item), 0)
    if (requests > MAX_BATCH_REQUESTS) {
      return left(new BatchTooLargeError(requests, req.items.length))
    }

    // Erro de cliente reprova o PEDIDO; erro de item reprova o ITEM. Sem esta
    // separação, "esse cliente não existe" voltaria como 201 com trinta e duas
    // recusas idênticas — tecnicamente verdade, e inútil para quem chamou.
    const customer = await this.customers.findById(req.customerId)
    if (!customer) return left(new CustomerNotFoundError(req.customerId))
    if (!customer.postizGroupId) {
      return left(new CustomerNotLinkedToGroupError(req.customerId))
    }

    const results: BatchItemResult[] = []

    // Em série, não em paralelo: o motor tem teto por hora, e disparar trinta e
    // duas publicações ao mesmo tempo trocaria um lote lento por um lote
    // recusado pela metade.
    for (const [index, item] of req.items.entries()) {
      results.push(await this.publishOne(index, item, req))
    }

    const scheduled = results.filter((r) => r.status === 'scheduled').length

    return right({
      total: results.length,
      scheduled,
      rejected: results.length - scheduled,
      results,
    })
  }

  private async publishOne(
    index: number,
    item: BatchItem,
    req: PublishSocialPostsBatchRequest,
  ): Promise<BatchItemResult> {
    try {
      const result = await this.publish.execute({
        ...item,
        customerId: req.customerId,
        createdByUserId: req.createdByUserId,
        now: req.now,
      })

      if (result.isLeft()) {
        const error = result.value
        return {
          index,
          status: 'rejected',
          error: error.message,
          ...(error instanceof ContentRulesViolationError
            ? { violations: error.violations }
            : {}),
        }
      }

      return {
        index,
        status: 'scheduled',
        publicationId: result.value.publicationId,
        scheduledFor: result.value.scheduledFor,
        targets: result.value.targets,
      }
    } catch (err) {
      // Falha de rede ou recusa do motor chega como exceção. Aqui ela vira o
      // resultado daquele item — deixar subir abortaria o lote inteiro, que é
      // exatamente o que esta rota existe para evitar.
      return { index, status: 'rejected', error: (err as Error).message }
    }
  }
}

/** Uma chamada para criar o post, mais uma por imagem que sobe antes dele. */
function engineCost(item: BatchItem): number {
  const images = item.creativeIds?.length ?? (item.creativeId ? 1 : 0)
  return 1 + images
}
