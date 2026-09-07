import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import {
  Customer,
  Creative,
  CreativeStrategy,
  StrategyPhase,
  StrategyStatus,
  StrategyComparison,
  PaginatedResponse,
} from '@/lib/definitions'
import NewStrategyForm from './_components/new-strategy-form'
import StrategyCard from './_components/strategy-card'

export const metadata = { title: 'Estratégias — WB Customer' }

const PHASE_LABEL: Record<StrategyPhase, string> = {
  exploration: 'Fase A — Exploração',
  refinement: 'Fase B — Lapidação',
}

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ phase?: string; status?: string; newStrategy?: string }>
}

export default async function StrategiesPage({ params, searchParams }: Props) {
  const { id } = await params
  const { phase, status, newStrategy } = await searchParams

  let customer: Customer
  try {
    customer = await apiServer.get<Customer>(`/api/v1/customers/${id}`)
  } catch {
    notFound()
  }

  // Fetch creatives (for strategy form + card enrichment)
  let creatives: Creative[] = []
  try {
    const res = await apiServer.get<PaginatedResponse<Creative>>(
      `/api/v1/customers/${id}/creatives?limit=200`,
    )
    creatives = res.items
  } catch {
    // empty
  }

  // Fetch strategies
  const stratQuery = new URLSearchParams()
  if (phase) stratQuery.set('phase', phase)
  if (status) stratQuery.set('status', status)
  stratQuery.set('limit', '100')

  let strategies: CreativeStrategy[] = []
  let total = 0
  try {
    const res = await apiServer.get<PaginatedResponse<CreativeStrategy>>(
      `/api/v1/customers/${id}/creative-strategies?${stratQuery}`,
    )
    strategies = res.items
    total = res.total
  } catch {
    // empty
  }

  // Comparativo de desempenho por estratégia — é o que sustenta a escolha do campeão.
  // Buscado em paralelo; se uma falhar, o card daquela estratégia cai para os chips simples.
  const comparisons = new Map<string, StrategyComparison>()
  await Promise.all(
    strategies.map(async s => {
      try {
        const data = await apiServer.get<StrategyComparison>(
          `/api/v1/customers/${id}/creative-strategies/${s.id}/comparison`,
        )
        comparisons.set(s.id, data)
      } catch {
        // sem comparativo para esta estratégia
      }
    }),
  )

  // Phase A strategies available as parents for phase B
  const phaseAStrategies = strategies.filter(s => s.phase === 'exploration')

  // Grouped for display
  const phaseAList = strategies.filter(s => s.phase === 'exploration')
  const phaseBList = strategies.filter(s => s.phase === 'refinement')

  const phaseFilters = [
    { value: '', label: 'Todas' },
    { value: 'exploration', label: 'Fase A' },
    { value: 'refinement', label: 'Fase B' },
  ]

  const statusFilters: { value: string; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'active', label: 'Ativa' },
    { value: 'completed', label: 'Concluída' },
    { value: 'paused', label: 'Pausada' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb + header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/customers/${id}`} className="text-md hover:text-hi transition-colors">
            {customer.name}
          </Link>
          <span className="text-lo">/</span>
          <Link href={`/customers/${id}/creatives`} className="text-md hover:text-hi transition-colors">
            Criativos
          </Link>
          <span className="text-lo">/</span>
          <span className="font-medium text-hi">Estratégias</span>
          {total > 0 && (
            <span className="rounded-full bg-elevated px-2 py-0.5 text-xs text-md">{total}</span>
          )}
        </div>
        <Link
          href="?newStrategy=1"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nova Estratégia
        </Link>
      </div>

      {/* New Strategy Form */}
      {newStrategy === '1' && (
        <NewStrategyForm
          customerId={id}
          creatives={creatives}
          parentStrategies={phaseAStrategies}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="text-xs text-lo mr-1">Fase:</span>
          {phaseFilters.map(f => {
            const p = new URLSearchParams()
            if (f.value) p.set('phase', f.value)
            if (status) p.set('status', status)
            const isActive = (phase ?? '') === f.value
            return (
              <Link
                key={f.value}
                href={`?${p}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive ? 'bg-accent text-white' : 'bg-elevated text-md hover:text-hi'
                }`}
              >
                {f.label}
              </Link>
            )
          })}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-lo mr-1">Status:</span>
          {statusFilters.map(f => {
            const p = new URLSearchParams()
            if (phase) p.set('phase', phase)
            if (f.value) p.set('status', f.value)
            const isActive = (status ?? '') === f.value
            return (
              <Link
                key={f.value}
                href={`?${p}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive ? 'bg-accent text-white' : 'bg-elevated text-md hover:text-hi'
                }`}
              >
                {f.label}
              </Link>
            )
          })}
        </div>
      </div>

      {strategies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-16 gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lo">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          <p className="text-sm text-lo">Nenhuma estratégia encontrada.</p>
          <Link href="?newStrategy=1" className="text-sm text-accent hover:underline">
            Criar a primeira estratégia
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Phase A */}
          {(!phase || phase === 'exploration') && phaseAList.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
                  Fase A — Exploração
                </span>
                <span className="text-xs text-lo">{phaseAList.length} estratégia{phaseAList.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {phaseAList.map(s => (
                  <StrategyCard
                    key={s.id}
                    strategy={s}
                    creatives={creatives}
                    customerId={id}
                    comparison={comparisons.get(s.id) ?? null}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Phase B */}
          {(!phase || phase === 'refinement') && phaseBList.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400">
                  Fase B — Lapidação
                </span>
                <span className="text-xs text-lo">{phaseBList.length} estratégia{phaseBList.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {phaseBList.map(s => (
                  <StrategyCard
                    key={s.id}
                    strategy={s}
                    creatives={creatives}
                    customerId={id}
                    comparison={comparisons.get(s.id) ?? null}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
