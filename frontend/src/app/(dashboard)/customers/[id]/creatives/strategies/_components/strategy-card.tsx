'use client'

import { useState, useTransition } from 'react'
import { Creative, CreativeStrategy, StrategyComparison, StrategyStatus } from '@/lib/definitions'
import CreativeComparison from './creative-comparison'
import { updateStrategy, deleteStrategy } from '@/app/actions/creative-strategies'
import { useToast } from '@/components/toast/toast-context'

const STATUS_LABEL: Record<StrategyStatus, string> = {
  active: 'Ativa',
  completed: 'Concluída',
  paused: 'Pausada',
}

const STATUS_COLOR: Record<StrategyStatus, string> = {
  active: 'bg-green-500/10 text-green-400 ring-green-600/20',
  completed: 'bg-blue-500/10 text-blue-400 ring-blue-600/20',
  paused: 'bg-amber-500/10 text-amber-400 ring-amber-600/20',
}

const OBJECTIVE_LABEL: Record<string, string> = {
  awareness: 'Reconhecimento',
  traffic: 'Tráfego',
  engagement: 'Engajamento',
  leads: 'Leads',
  sales: 'Vendas',
  retargeting: 'Retargeting',
}

interface Props {
  strategy: CreativeStrategy
  creatives: Creative[]
  customerId: string
  /** Ausente quando a busca do comparativo falhou; o card degrada para os chips simples. */
  comparison?: StrategyComparison | null
}

const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function StrategyCard({ strategy, creatives, customerId, comparison }: Props) {
  const { success, error, confirm } = useToast()
  const [isPending, startTransition] = useTransition()
  const [showWinnerPicker, setShowWinnerPicker] = useState(false)

  // Creatives that belong to this strategy
  const strategyCreatives = strategy.items
    .sort((a, b) => a.position - b.position)
    .map(item => creatives.find(c => c.id === item.creativeId))
    .filter(Boolean) as Creative[]

  const winner = strategy.winnerId
    ? creatives.find(c => c.id === strategy.winnerId)
    : null

  const totalsByCreative = new Map(
    (comparison?.entries ?? []).map(e => [e.creativeId, e.totals]),
  )

  // Resumo curto para o seletor: escolher o campeão sem ver número era o problema.
  function metricHint(creativeId: string): string | null {
    const t = totalsByCreative.get(creativeId)
    if (!t || t.recordCount === 0) return null
    const parts: string[] = []
    if (t.ctr != null) parts.push(`CTR ${nf2.format(t.ctr)}%`)
    if (t.cpa != null) parts.push(`CPA R$ ${nf2.format(t.cpa)}`)
    return parts.length > 0 ? parts.join(' · ') : null
  }

  function changeStatus(newStatus: StrategyStatus) {
    startTransition(async () => {
      const result = await updateStrategy(customerId, strategy.id, { status: newStatus })
      if (result.message) {
        error(result.message)
      } else {
        success(`Estratégia ${STATUS_LABEL[newStatus].toLowerCase()}.`)
      }
    })
  }

  function handleSetWinner(creativeId: string) {
    startTransition(async () => {
      const result = await updateStrategy(customerId, strategy.id, { winnerId: creativeId })
      if (result.message) {
        error(result.message)
      } else {
        success('Vencedor definido.')
        setShowWinnerPicker(false)
      }
    })
  }

  function handleDelete() {
    confirm({
      message: `Excluir estratégia "${strategy.name}"?`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        startTransition(async () => {
          try {
            await deleteStrategy(customerId, strategy.id)
            success('Estratégia excluída.')
          } catch {
            error('Não foi possível excluir.')
          }
        })
      },
    })
  }

  return (
    <div className={`rounded-xl border bg-surface flex flex-col gap-0 overflow-hidden transition-shadow hover:shadow-md ${
      strategy.phase === 'exploration' ? 'border-border' : 'border-violet-500/30'
    }`}>
      {/* Header */}
      <div className={`px-5 py-4 flex items-start justify-between gap-3 ${
        strategy.phase === 'exploration'
          ? 'border-b border-border'
          : 'border-b border-violet-500/20 bg-violet-500/5'
      }`}>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              strategy.phase === 'exploration'
                ? 'bg-sky-500/10 text-sky-400'
                : 'bg-violet-500/10 text-violet-400'
            }`}>
              {strategy.phase === 'exploration' ? 'Fase A — Exploração' : 'Fase B — Lapidação'}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_COLOR[strategy.status]}`}>
              {STATUS_LABEL[strategy.status]}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-hi truncate">{strategy.name}</h3>
          {strategy.objective && (
            <p className="text-xs text-lo">{OBJECTIVE_LABEL[strategy.objective] ?? strategy.objective}</p>
          )}
        </div>

        {/* Meta */}
        <div className="shrink-0 text-right text-xs text-lo flex flex-col gap-0.5">
          {strategy.budget != null && (
            <p>R$ {strategy.budget.toLocaleString('pt-BR')}</p>
          )}
          {strategy.durationDays != null && (
            <p>{strategy.durationDays}d</p>
          )}
          {strategy.startAt && (
            <p>{new Date(strategy.startAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
          )}
        </div>
      </div>

      {/* Creatives strip */}
      <div className="px-5 py-3 flex flex-col gap-2">
        <p className="text-xs text-lo">{strategyCreatives.length} criativo{strategyCreatives.length !== 1 ? 's' : ''}</p>
        {comparison && (
          <CreativeComparison entries={comparison.entries} highlights={comparison.highlights} />
        )}
        {!comparison && strategyCreatives.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {strategyCreatives.map(c => (
              <div
                key={c.id}
                className={`relative flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${
                  c.id === strategy.winnerId
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                    : 'border-border bg-canvas text-md'
                }`}
              >
                {c.id === strategy.winnerId && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                )}
                <span className="max-w-[100px] truncate">{c.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Winner section */}
        {winner && !showWinnerPicker && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="font-medium">Vencedor:</span>
            <span className="truncate max-w-[180px]">{winner.title}</span>
          </div>
        )}

        {/* Winner picker */}
        {showWinnerPicker && (
          <div className="mt-1 flex flex-col gap-2">
            <p className="text-xs font-medium text-lo">Selecionar vencedor:</p>
            <div className="flex flex-wrap gap-1.5">
              {strategyCreatives.map(c => (
                <button
                  key={c.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSetWinner(c.id)}
                  className={`flex flex-col items-start gap-0.5 rounded-lg border px-2.5 py-1 text-xs transition-colors disabled:opacity-50 ${
                    c.id === strategy.winnerId
                      ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                      : 'border-border bg-canvas text-md hover:bg-elevated'
                  }`}
                >
                  <span className="max-w-[160px] truncate">{c.title}</span>
                  {metricHint(c.id) ? (
                    <span className="text-[10px] tabular-nums text-lo">{metricHint(c.id)}</span>
                  ) : (
                    comparison && <span className="text-[10px] text-lo">sem métrica</span>
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowWinnerPicker(false)}
              className="text-xs text-lo hover:text-hi w-fit"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Notes */}
      {strategy.notes && (
        <div className="px-5 pb-3">
          <p className="text-xs text-lo line-clamp-2">{strategy.notes}</p>
        </div>
      )}

      {/* Actions footer */}
      <div className="mt-auto border-t border-border px-5 py-3 flex items-center gap-3 flex-wrap">
        {/* Status transitions */}
        {strategy.status === 'active' && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowWinnerPicker(v => !v)}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Definir vencedor
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => changeStatus('completed')}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Concluir
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => changeStatus('paused')}
              className="flex items-center gap-1 text-xs text-lo hover:text-hi transition-colors disabled:opacity-50"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
              </svg>
              Pausar
            </button>
          </>
        )}
        {strategy.status === 'paused' && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => changeStatus('active')}
            className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Reativar
          </button>
        )}
        {strategy.status === 'completed' && (
          <span className="text-xs text-lo">Estratégia concluída</span>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={handleDelete}
          className="ml-auto flex items-center gap-1 text-xs text-lo hover:text-red-400 transition-colors disabled:opacity-50"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
          Excluir
        </button>
      </div>
    </div>
  )
}
