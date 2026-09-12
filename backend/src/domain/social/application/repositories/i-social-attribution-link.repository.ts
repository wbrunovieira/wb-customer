export interface SocialAttributionLinkRecord {
  id?: string
  /** Código curto que viaja no texto pré-preenchido do wa.me. */
  code: string
  /** instagram | facebook | outro */
  source: string
  customerId: string
  /** Referência livre ao post enquanto SocialPost não existe. */
  postRef?: string | null
  destinationPhone: string
  prefilledMessage: string
  createdByUserId: string
  createdAt?: Date
}

export type StoredAttributionLink = SocialAttributionLinkRecord & { id: string }

export abstract class ISocialAttributionLinkRepository {
  abstract create(record: SocialAttributionLinkRecord): Promise<string>
  /** Usado pelo webhook para resolver o código que chegou na mensagem. */
  abstract findByCode(code: string): Promise<StoredAttributionLink | null>
  abstract findByCustomerId(customerId: string): Promise<StoredAttributionLink[]>
}
