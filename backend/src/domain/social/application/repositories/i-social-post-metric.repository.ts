export interface SocialPostMetricRecord {
  postizPostId: string
  customerId: string
  provider: string
  /** Nulo é "a rede não informou", que é diferente de zero. */
  views?: number | null
  reach?: number | null
  likes?: number | null
  comments?: number | null
  shares?: number | null
  saves?: number | null
  /** O que a rede devolveu, inteiro, para não perder rótulo ainda sem coluna. */
  raw: unknown
  collectedAt: Date
}

export abstract class ISocialPostMetricRepository {
  /** Idempotente por postizPostId: coletar de novo atualiza, não duplica. */
  abstract upsert(record: SocialPostMetricRecord): Promise<void>
  abstract findByPostizPostId(postId: string): Promise<SocialPostMetricRecord | null>
  abstract findByCustomerId(customerId: string): Promise<SocialPostMetricRecord[]>
}
