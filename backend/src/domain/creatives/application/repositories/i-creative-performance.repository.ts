export interface CreativePerformanceRecord {
  id?: string
  creativeId: string
  platform: string
  campaignId?: string | null
  impressions: number
  clicks: number
  conversions: number
  spend: number
  ctr?: number | null
  cpc?: number | null
  cpa?: number | null
  roas?: number | null
  startDate: Date
  endDate?: Date | null
  notes?: string | null
  /** 'manual' quando digitado por uma pessoa, 'meta_sync' quando veio do sync de tráfego pago. */
  source?: string | null
}

/**
 * Registro produzido pelo sync automático. campaignId e source são obrigatórios
 * porque juntos com creativeId formam a chave de idempotência do upsert.
 */
export interface SyncedCreativePerformanceRecord extends CreativePerformanceRecord {
  campaignId: string
  source: string
}

export abstract class ICreativePerformanceRepository {
  abstract create(record: CreativePerformanceRecord): Promise<string>
  abstract findByCreativeId(creativeId: string): Promise<CreativePerformanceRecord[]>
  /**
   * Cria ou atualiza a linha identificada por (creativeId, campaignId, source).
   * Nunca toca em registros com outro source — o que foi digitado à mão fica intacto.
   */
  abstract upsertSynced(record: SyncedCreativePerformanceRecord): Promise<string>
}
