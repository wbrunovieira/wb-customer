export interface SocialPublicationTargetRecord {
  /** Canal no Postiz (integration id). */
  channelId: string
  /** instagram | facebook | linkedin… */
  provider: string
  /** Id do post no motor. */
  postizPostId: string
}

export interface SocialPublicationRecord {
  id?: string
  customerId: string
  /** Grupo do cliente no momento da publicação, guardado para auditoria. */
  postizGroupId: string
  content: string
  mode: 'now' | 'schedule'
  scheduledFor: Date
  attributionLinkId?: string | null
  creativeId?: string | null
  createdByUserId: string
  createdAt?: Date
  targets: SocialPublicationTargetRecord[]
}

export type StoredSocialPublication = SocialPublicationRecord & {
  id: string
  createdAt: Date
}

export abstract class ISocialPublicationRepository {
  abstract create(record: SocialPublicationRecord): Promise<string>
  abstract findByCustomerId(customerId: string): Promise<StoredSocialPublication[]>
  /** Caminho de volta a partir do motor, usado pelas métricas e pelo webhook. */
  abstract findByPostizPostId(postId: string): Promise<StoredSocialPublication | null>
}
