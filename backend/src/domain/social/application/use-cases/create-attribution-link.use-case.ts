import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { CustomerNotFoundError } from '@/domain/customers/domain/exceptions/customer-not-found.error'
import { ISocialAttributionLinkRepository } from '../repositories/i-social-attribution-link.repository'
import {
  buildAttributionCode,
  buildPrefilledMessage,
  buildWhatsAppLink,
} from '../services/attribution-marker'

export interface CreateAttributionLinkRequest {
  customerId: string
  /** instagram | facebook | outro */
  source: string
  destinationPhone: string
  /** Texto que o cliente vê ao abrir a conversa. O marcador é anexado a ele. */
  baseMessage?: string
  /** Referência livre ao post enquanto SocialPost não existe. */
  postRef?: string
  createdByUserId: string
}

export interface CreateAttributionLinkResponse {
  linkId: string
  code: string
  prefilledMessage: string
  /** wa.me pronto para ir no post. */
  url: string
}

export type CreateAttributionLinkResult = Either<
  CustomerNotFoundError,
  CreateAttributionLinkResponse
>

const SOURCE_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
}

/** Quantas vezes tentar outro código antes de desistir de evitar colisão. */
const MAX_CODE_ATTEMPTS = 5

/**
 * Gera o link rastreável que vai no post.
 *
 * É o que torna possível responder "quantas conversas vieram do Instagram" —
 * pergunta que, sem marcação, nenhum dado existente responde: nem Activity nem
 * WhatsAppMessage guardam origem.
 */
@Injectable()
export class CreateAttributionLinkUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly links: ISocialAttributionLinkRepository,
  ) {}

  /** Ponto de sobrescrita para teste; em produção é sorteio. */
  protected generateCode(): string {
    return buildAttributionCode()
  }

  async execute(req: CreateAttributionLinkRequest): Promise<CreateAttributionLinkResult> {
    const customer = await this.customers.findById(req.customerId)
    if (!customer) return left(new CustomerNotFoundError(req.customerId))

    const code = await this.allocateCode()
    const base = req.baseMessage?.trim() || this.defaultMessage(req.source)
    const prefilledMessage = buildPrefilledMessage(base, code)

    const linkId = await this.links.create({
      code,
      source: req.source,
      customerId: req.customerId,
      postRef: req.postRef ?? null,
      destinationPhone: req.destinationPhone,
      prefilledMessage,
      createdByUserId: req.createdByUserId,
    })

    return right({
      linkId,
      code,
      prefilledMessage,
      url: buildWhatsAppLink(req.destinationPhone, prefilledMessage),
    })
  }

  /**
   * O código é curto para caber na mensagem sem incomodar, então colisão é
   * possível. Sortear de novo é mais barato do que alongar o código.
   */
  private async allocateCode(): Promise<string> {
    let code = this.generateCode()

    for (let attempt = 1; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const taken = await this.links.findByCode(code)
      if (!taken) return code
      code = this.generateCode()
    }

    return code
  }

  private defaultMessage(source: string): string {
    return `Olá! Vim pelo ${SOURCE_LABEL[source] ?? source}.`
  }
}
