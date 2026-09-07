import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/either'
import { ICreativeStrategyRepository } from '../repositories/i-creative-strategy.repository'
import { ICreativeRepository } from '../repositories/i-creative.repository'
import { ICreativePerformanceRepository } from '../repositories/i-creative-performance.repository'
import { CreativeStrategy } from '../../enterprise/entities/creative-strategy'
import { Creative } from '../../enterprise/entities/creative'
import { CreativeStrategyNotFoundError } from '../../domain/exceptions/creative-strategy-not-found.error'

export interface GetCreativeStrategyComparisonRequest {
  customerId: string
  strategyId: string
}

export interface StrategyCreativeTotals {
  recordCount: number
  impressions: number
  clicks: number
  conversions: number
  spend: number
  ctr: number | null
  cpc: number | null
  cpa: number | null
  roas: number | null
  platforms: string[]
}

export interface StrategyComparisonEntry {
  creative: Creative
  position: number
  isWinner: boolean
  totals: StrategyCreativeTotals
}

/**
 * Quem lidera cada métrica, por creativeId. Null quando nenhum criativo do lote
 * tem dado suficiente — melhor não apontar líder do que apontar um falso.
 */
export interface StrategyComparisonHighlights {
  bestCtr: string | null
  bestCpa: string | null
  bestRoas: string | null
  mostConversions: string | null
}

export interface GetCreativeStrategyComparisonResponse {
  strategy: CreativeStrategy
  entries: StrategyComparisonEntry[]
  highlights: StrategyComparisonHighlights
}

export type GetCreativeStrategyComparisonResult = Either<
  CreativeStrategyNotFoundError,
  GetCreativeStrategyComparisonResponse
>

/**
 * Reúne, lado a lado, o desempenho de cada criativo de uma estratégia.
 *
 * É o número que sustenta a escolha do campeão da fase de exploração — antes disso a
 * escolha era feita sem métrica nenhuma na tela. Deliberadamente não inventa uma nota
 * única de ranking: aponta quem lidera cada métrica e deixa a decisão com quem conhece
 * o objetivo da campanha.
 */
@Injectable()
export class GetCreativeStrategyComparisonUseCase {
  constructor(
    private readonly strategyRepo: ICreativeStrategyRepository,
    private readonly creativeRepo: ICreativeRepository,
    private readonly performanceRepo: ICreativePerformanceRepository,
  ) {}

  async execute(
    req: GetCreativeStrategyComparisonRequest,
  ): Promise<GetCreativeStrategyComparisonResult> {
    const strategy = await this.strategyRepo.findById(req.strategyId)

    if (!strategy || strategy.customerId !== req.customerId) {
      return left(new CreativeStrategyNotFoundError(req.strategyId))
    }

    const entries: StrategyComparisonEntry[] = []
    const items = [...strategy.items].sort((a, b) => a.position - b.position)

    for (const item of items) {
      const creative = await this.creativeRepo.findById(item.creativeId)

      // Um criativo removido pode continuar vinculado; não entra na comparação.
      if (!creative || creative.isDeleted) continue

      const records = await this.performanceRepo.findByCreativeId(item.creativeId)

      entries.push({
        creative,
        position: item.position,
        isWinner: strategy.winnerId === item.creativeId,
        totals: this.aggregate(records),
      })
    }

    return right({ strategy, entries, highlights: this.pickHighlights(entries) })
  }

  private aggregate(
    records: Awaited<ReturnType<ICreativePerformanceRepository['findByCreativeId']>>,
  ): StrategyCreativeTotals {
    const impressions = records.reduce((s, r) => s + r.impressions, 0)
    const clicks = records.reduce((s, r) => s + r.clicks, 0)
    const conversions = records.reduce((s, r) => s + r.conversions, 0)
    const spend = records.reduce((s, r) => s + r.spend, 0)

    return {
      recordCount: records.length,
      impressions,
      clicks,
      conversions,
      spend,
      // Taxas derivadas dos totais: a média das taxas de cada registro distorce o
      // resultado quando os registros têm volumes muito diferentes.
      ctr: ratio(clicks, impressions, 100),
      cpc: ratio(spend, clicks),
      cpa: ratio(spend, conversions),
      roas: ratio(conversions, spend),
      platforms: [...new Set(records.map((r) => r.platform))],
    }
  }

  private pickHighlights(entries: StrategyComparisonEntry[]): StrategyComparisonHighlights {
    return {
      bestCtr: leader(entries, (t) => t.ctr, 'desc'),
      bestCpa: leader(entries, (t) => t.cpa, 'asc'),
      bestRoas: leader(entries, (t) => t.roas, 'desc'),
      mostConversions: leader(
        entries,
        (t) => (t.recordCount > 0 ? t.conversions : null),
        'desc',
      ),
    }
  }
}

/**
 * creativeId que lidera a métrica. `asc` para métricas de custo, onde menor é melhor.
 * Entradas sem valor ficam de fora em vez de contarem como zero.
 */
function leader(
  entries: StrategyComparisonEntry[],
  pick: (totals: StrategyCreativeTotals) => number | null,
  direction: 'asc' | 'desc',
): string | null {
  const candidates = entries
    .map((e) => ({ id: e.creative.id.value, value: pick(e.totals) }))
    .filter((c): c is { id: string; value: number } => c.value != null)

  if (candidates.length === 0) return null

  return candidates.reduce((best, current) =>
    direction === 'desc'
      ? current.value > best.value
        ? current
        : best
      : current.value < best.value
        ? current
        : best,
  ).id
}

function ratio(numerator: number, denominator: number, scale = 1): number | null {
  if (denominator <= 0) return null
  return (numerator / denominator) * scale
}
