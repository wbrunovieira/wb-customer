import { StrategyComparisonEntry, StrategyComparisonHighlights } from '@/lib/definitions'

interface Props {
  entries: StrategyComparisonEntry[]
  highlights: StrategyComparisonHighlights
}

const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function pct(v: number | null) {
  return v == null ? '—' : `${nf2.format(v)}%`
}

function money(v: number | null) {
  return v == null ? '—' : `R$ ${nf2.format(v)}`
}

/** Selo de liderança. Cada métrica ganha uma cor própria para leitura rápida na coluna. */
function Leader({ label, tone }: { label: string; tone: 'ctr' | 'cpa' | 'conv' }) {
  const tones = {
    ctr: 'bg-sky-500/10 text-sky-400 ring-sky-600/20',
    cpa: 'bg-emerald-500/10 text-emerald-400 ring-emerald-600/20',
    conv: 'bg-violet-500/10 text-violet-400 ring-violet-600/20',
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-px text-[10px] font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {label}
    </span>
  )
}

export default function CreativeComparison({ entries, highlights }: Props) {
  const withData = entries.filter((e) => e.totals.recordCount > 0)

  if (entries.length === 0) {
    return null
  }

  // Sem nenhuma métrica ainda, uma tabela vazia só ocuparia espaço e sugeriria erro.
  if (withData.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-canvas px-3 py-2.5">
        <p className="text-xs text-lo">
          Nenhuma métrica ainda. Os números aparecem aqui após a sincronização diária do
          tráfego pago.
        </p>
      </div>
    )
  }

  const totalSpend = entries.reduce((s, e) => s + e.totals.spend, 0)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-md">Desempenho</p>
        {totalSpend > 0 && (
          <p className="text-[11px] text-lo">{money(totalSpend)} investidos</p>
        )}
      </div>

      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-lo">
              <th className="px-1 pb-1 font-medium">Criativo</th>
              <th className="px-1 pb-1 text-right font-medium">CTR</th>
              <th className="px-1 pb-1 text-right font-medium">CPA</th>
              <th className="px-1 pb-1 text-right font-medium">Conv.</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const noData = e.totals.recordCount === 0
              return (
                <tr
                  key={e.creativeId}
                  className={`border-t border-border/60 ${noData ? 'opacity-50' : ''}`}
                >
                  <td className="max-w-[150px] px-1 py-1.5">
                    <div className="flex items-center gap-1">
                      {e.isWinner && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          stroke="none"
                          className="shrink-0 text-amber-400"
                          aria-label="Vencedor"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      )}
                      <span
                        className={`truncate ${e.isWinner ? 'font-medium text-amber-400' : 'text-md'}`}
                        title={e.title}
                      >
                        {e.title}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {highlights.bestCtr === e.creativeId && <Leader label="melhor CTR" tone="ctr" />}
                      {highlights.bestCpa === e.creativeId && <Leader label="menor CPA" tone="cpa" />}
                      {highlights.mostConversions === e.creativeId && (
                        <Leader label="+ conversões" tone="conv" />
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-1.5 text-right tabular-nums text-hi">{pct(e.totals.ctr)}</td>
                  <td className="px-1 py-1.5 text-right tabular-nums text-hi">{money(e.totals.cpa)}</td>
                  <td className="px-1 py-1.5 text-right tabular-nums text-hi">
                    {e.totals.recordCount === 0 ? '—' : nf.format(e.totals.conversions)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {withData.length < entries.length && (
        <p className="text-[11px] text-lo">
          {entries.length - withData.length} criativo
          {entries.length - withData.length !== 1 ? 's' : ''} ainda sem métrica.
        </p>
      )}
    </div>
  )
}
