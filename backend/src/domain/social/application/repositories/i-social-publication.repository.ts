export interface SocialPublicationTargetRecord {
  /** Canal no Postiz (integration id). */
  channelId: string
  /** instagram | facebook | linkedin… */
  provider: string
  /** Id do post no motor. */
  postizPostId: string
  /** Estado espelhado do motor: QUEUE, PUBLISHED, ERROR, DRAFT. */
  state?: string
  failureReason?: string | null
  publishedUrl?: string | null
  lastCheckedAt?: Date | null
}

/** Um destino ainda sem desfecho, com o contexto para perguntar ao motor. */
export interface ReconcilableTarget {
  publicationId: string
  customerId: string
  /** Grupo do cliente no momento da publicação; é por ele que se lê a fila. */
  postizGroupId: string
  postizPostId: string
  channelId: string
  provider: string
  state: string
  scheduledFor: Date
}

export interface UpdateTargetStateInput {
  postizPostId: string
  state: string
  failureReason?: string | null
  publishedUrl?: string | null
  checkedAt: Date
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

  /**
   * Destinos que ainda não têm desfecho (nem publicado, nem falhado).
   *
   * O motor não avisa quando falha — o webhook dele só dispara em sucesso —,
   * então saber de uma falha depende de vir perguntar.
   */
  abstract findTargetsToReconcile(limit?: number): Promise<ReconcilableTarget[]>

  abstract updateTargetState(input: UpdateTargetStateInput): Promise<void>

  /**
   * Destinos que já saíram, dentro de uma janela.
   *
   * A janela existe porque algumas métricas demoram a estabilizar: coletar só
   * o dia anterior congelaria números que ainda iam mudar.
   */
  abstract findPublishedTargetsSince(
    since: Date,
    limit?: number,
  ): Promise<ReconcilableTarget[]>
}
