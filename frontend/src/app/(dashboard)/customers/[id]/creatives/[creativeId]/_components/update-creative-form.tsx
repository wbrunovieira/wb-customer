'use client'

import { useState, useTransition } from 'react'
import { Creative, CreativeStage, CreativeStatus } from '@/lib/definitions'
import { updateCreative } from '@/app/actions/creatives'
import { useToast } from '@/components/toast/toast-context'

const OBJECTIVES = [
  { value: 'awareness', label: 'Reconhecimento' },
  { value: 'traffic', label: 'Tráfego' },
  { value: 'engagement', label: 'Engajamento' },
  { value: 'leads', label: 'Leads' },
  { value: 'sales', label: 'Vendas' },
  { value: 'retargeting', label: 'Retargeting' },
]

const STATUSES: { value: CreativeStatus; label: string }[] = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'active', label: 'Ativo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'archived', label: 'Arquivado' },
]

const STAGES: { value: CreativeStage; label: string; color: string }[] = [
  { value: 'exploration', label: 'Exploração', color: 'bg-sky-500/10 text-sky-400 ring-sky-600/20' },
  { value: 'refinement', label: 'Lapidação', color: 'bg-violet-500/10 text-violet-400 ring-violet-600/20' },
  { value: 'scale', label: 'Escala', color: 'bg-green-500/10 text-green-400 ring-green-600/20' },
]

const VARIATION_SUGGESTIONS = [
  'Headline', 'Background', 'Cores', 'CTA', 'Hook',
  'Formato', 'Thumbnail', 'Áudio', 'Texto no criativo', 'Caption',
  'Produto em destaque', 'Prova social', 'Urgência',
]

interface Props {
  creative: Creative
  allCreatives?: Creative[]
}

export default function UpdateCreativeForm({ creative, allCreatives = [] }: Props) {
  const { success, error } = useToast()
  const [isPending, startTransition] = useTransition()
  const [stage, setStage] = useState<CreativeStage | null>(creative.stage)
  const [variationAspects, setVariationAspects] = useState<string[]>(creative.variationAspects)
  const [aspectInput, setAspectInput] = useState('')

  const explorationCreatives = allCreatives.filter(
    c => c.stage === 'exploration' && c.id !== creative.id,
  )

  function addAspect(val: string) {
    const trimmed = val.trim()
    if (!trimmed || variationAspects.includes(trimmed)) return
    setVariationAspects(prev => [...prev, trimmed])
    setAspectInput('')
  }

  function removeAspect(aspect: string) {
    setVariationAspects(prev => prev.filter(a => a !== aspect))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    startTransition(async () => {
      const result = await updateCreative(creative.customerId, creative.id, {
        title: data.get('title') as string,
        status: data.get('status') as string,
        caption: (data.get('caption') as string) || null,
        textInCreative: (data.get('textInCreative') as string) || null,
        designDescription: (data.get('designDescription') as string) || null,
        objective: (data.get('objective') as string) || null,
        stage: stage,
        parentCreativeId: (data.get('parentCreativeId') as string) || null,
        variationAspects,
      })

      if (result.message) {
        error(result.message)
      } else {
        success('Criativo atualizado.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Stage */}
      <div>
        <label className="block text-xs font-medium text-lo mb-2">Etapa</label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStage(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-all ${
              stage === null ? 'bg-elevated text-hi ring-border' : 'bg-canvas text-lo ring-border hover:text-md'
            }`}
          >
            Sem etapa
          </button>
          {STAGES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStage(s.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-all ${
                stage === s.value ? s.color : 'bg-canvas text-lo ring-border hover:text-md'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Refinement fields */}
      {stage === 'refinement' && (
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4 flex flex-col gap-4">
          <p className="text-xs text-violet-400 font-medium">Lapidação — variação de criativo existente</p>

          {explorationCreatives.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-lo mb-1">Criativo de origem</label>
              <select
                name="parentCreativeId"
                defaultValue={creative.parentCreativeId ?? ''}
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <option value="">Selecione o criativo de origem</option>
                {explorationCreatives.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-lo mb-2">O que está sendo variado</label>
            {variationAspects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {variationAspects.map(a => (
                  <span key={a} className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-300 ring-1 ring-violet-500/20">
                    {a}
                    <button type="button" onClick={() => removeAspect(a)} className="ml-0.5 hover:text-white transition-colors">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {VARIATION_SUGGESTIONS.filter(s => !variationAspects.includes(s)).map(s => (
                <button key={s} type="button" onClick={() => addAspect(s)}
                  className="rounded-full bg-elevated px-2.5 py-0.5 text-xs text-md hover:text-hi hover:bg-border transition-colors">
                  + {s}
                </button>
              ))}
            </div>
            <input
              value={aspectInput}
              onChange={e => setAspectInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAspect(aspectInput) } }}
              placeholder="Novo tipo... (Enter para adicionar)"
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Título</label>
          <input
            name="title"
            required
            defaultValue={creative.title}
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Status</label>
          <select
            name="status"
            defaultValue={creative.status}
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Objetivo</label>
          <select
            name="objective"
            defaultValue={creative.objective ?? ''}
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="">Nenhum</option>
            {OBJECTIVES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Texto no criativo</label>
          <input
            name="textInCreative"
            defaultValue={creative.textInCreative ?? ''}
            placeholder="ex: DESCONTO 30% • Aproveite agora"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Caption</label>
          <textarea
            name="caption"
            rows={2}
            defaultValue={creative.caption ?? ''}
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Descrição do design</label>
          <textarea
            name="designDescription"
            rows={2}
            defaultValue={creative.designDescription ?? ''}
            placeholder="ex: Imagem grande, produto em destaque, fundo branco, texto curto"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
          />
          <p className="mt-1 text-xs text-lo">Descreva o estilo/conceito — usado para análise de padrões</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
