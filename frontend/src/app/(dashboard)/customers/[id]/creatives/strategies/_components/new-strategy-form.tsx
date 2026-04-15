'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Creative, CreativeStrategy } from '@/lib/definitions'
import { createStrategy } from '@/app/actions/creative-strategies'
import { useToast } from '@/components/toast/toast-context'

const OBJECTIVES = [
  { value: 'awareness', label: 'Reconhecimento' },
  { value: 'traffic', label: 'Tráfego' },
  { value: 'engagement', label: 'Engajamento' },
  { value: 'leads', label: 'Leads' },
  { value: 'sales', label: 'Vendas' },
  { value: 'retargeting', label: 'Retargeting' },
]

interface Props {
  customerId: string
  creatives: Creative[]
  parentStrategies: CreativeStrategy[] // phase A strategies to link phase B to
}

export default function NewStrategyForm({ customerId, creatives, parentStrategies }: Props) {
  const router = useRouter()
  const { success, error } = useToast()
  const [isPending, startTransition] = useTransition()
  const [phase, setPhase] = useState<'exploration' | 'refinement'>('exploration')
  const [selectedCreativeIds, setSelectedCreativeIds] = useState<string[]>([])

  function toggleCreative(id: string) {
    setSelectedCreativeIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id],
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    if (selectedCreativeIds.length === 0) {
      error('Selecione pelo menos um criativo.')
      return
    }

    const budget = data.get('budget') as string
    const durationDays = data.get('durationDays') as string
    const startAt = data.get('startAt') as string
    const parentStrategyId = data.get('parentStrategyId') as string

    startTransition(async () => {
      const result = await createStrategy(customerId, {
        name: data.get('name') as string,
        phase,
        objective: (data.get('objective') as string) || undefined,
        budget: budget ? Number(budget) : undefined,
        durationDays: durationDays ? Number(durationDays) : undefined,
        startAt: startAt || undefined,
        parentStrategyId: parentStrategyId || undefined,
        creativeIds: selectedCreativeIds,
        notes: (data.get('notes') as string) || undefined,
      })

      if (result.message) {
        error(result.message)
        return
      }

      success('Estratégia criada com sucesso.')
      router.push(`/customers/${customerId}/creatives/strategies`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-5">
      <h3 className="text-sm font-semibold text-hi">Nova Estratégia</h3>

      {/* Phase selector */}
      <div>
        <label className="block text-xs font-medium text-lo mb-2">Fase *</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPhase('exploration')}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              phase === 'exploration'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-canvas text-md hover:bg-elevated'
            }`}
          >
            <span className="block text-xs opacity-70 mb-0.5">Fase A</span>
            Exploração
          </button>
          <button
            type="button"
            onClick={() => setPhase('refinement')}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              phase === 'refinement'
                ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                : 'border-border bg-canvas text-md hover:bg-elevated'
            }`}
          >
            <span className="block text-xs opacity-70 mb-0.5">Fase B</span>
            Lapidação
          </button>
        </div>
        {phase === 'exploration' && (
          <p className="mt-2 text-xs text-lo">Teste ~10 criativos diferentes por ~5 dias para encontrar o melhor performer.</p>
        )}
        {phase === 'refinement' && (
          <p className="mt-2 text-xs text-lo">Crie variações do criativo vencedor da Fase A para maximizar resultados.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Nome *</label>
          <input
            name="name"
            required
            placeholder="ex: Exploração Abril 2026"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        {/* Phase B: parent strategy link */}
        {phase === 'refinement' && parentStrategies.length > 0 && (
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-lo mb-1">Estratégia Fase A (origem)</label>
            <select
              name="parentStrategyId"
              defaultValue=""
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="">Nenhuma</option>
              {parentStrategies.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Objetivo</label>
          <select
            name="objective"
            defaultValue=""
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="">Nenhum</option>
            {OBJECTIVES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Budget (R$)</label>
          <input
            name="budget"
            type="number"
            min="0"
            step="0.01"
            placeholder="500.00"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Duração (dias)</label>
          <input
            name="durationDays"
            type="number"
            min="1"
            placeholder="5"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Data início</label>
          <input
            name="startAt"
            type="date"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Notas</label>
          <textarea
            name="notes"
            rows={2}
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
          />
        </div>
      </div>

      {/* Creative selector */}
      <div>
        <label className="block text-xs font-medium text-lo mb-2">
          Criativos *
          <span className="ml-2 text-md font-normal">({selectedCreativeIds.length} selecionado{selectedCreativeIds.length !== 1 ? 's' : ''})</span>
        </label>
        {creatives.length === 0 ? (
          <p className="text-xs text-lo">Nenhum criativo disponível. Crie criativos primeiro.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 max-h-64 overflow-y-auto pr-1">
            {creatives.map(c => {
              const selected = selectedCreativeIds.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCreative(c.id)}
                  className={`relative flex flex-col rounded-lg border p-2 text-left transition-colors ${
                    selected
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-canvas hover:bg-elevated'
                  }`}
                >
                  {/* Mini thumbnail */}
                  <div className="mb-1.5 h-16 w-full rounded overflow-hidden bg-elevated flex items-center justify-center">
                    {c.thumbnailUrl || (c.driveViewUrl && c.mimeType?.startsWith('image')) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.thumbnailUrl ?? c.driveViewUrl ?? ''}
                        alt={c.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lo">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs font-medium text-hi line-clamp-2 leading-snug">{c.title}</p>
                  {selected && (
                    <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end border-t border-border pt-4">
        <button
          type="button"
          onClick={() => router.push(`/customers/${customerId}/creatives/strategies`)}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-md hover:bg-elevated transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Criando...' : 'Criar Estratégia'}
        </button>
      </div>
    </form>
  )
}
