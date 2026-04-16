'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Creative, CreativeStage } from '@/lib/definitions'
import { createCreative, uploadCreativeFile } from '@/app/actions/creatives'
import { useToast } from '@/components/toast/toast-context'

const TYPES = [
  { value: 'image', label: 'Imagem' },
  { value: 'video', label: 'Vídeo' },
  { value: 'carousel', label: 'Carrossel' },
]

const STAGES: { value: CreativeStage; label: string; color: string }[] = [
  { value: 'exploration', label: 'Exploração', color: 'bg-sky-500/10 text-sky-400 ring-sky-600/20' },
  { value: 'refinement', label: 'Lapidação', color: 'bg-violet-500/10 text-violet-400 ring-violet-600/20' },
  { value: 'scale', label: 'Escala', color: 'bg-green-500/10 text-green-400 ring-green-600/20' },
]

const OBJECTIVES = [
  { value: 'awareness', label: 'Reconhecimento' },
  { value: 'traffic', label: 'Tráfego' },
  { value: 'engagement', label: 'Engajamento' },
  { value: 'leads', label: 'Leads' },
  { value: 'sales', label: 'Vendas' },
  { value: 'retargeting', label: 'Retargeting' },
]

const VARIATION_SUGGESTIONS = [
  'Headline', 'Background', 'Cores', 'CTA', 'Hook',
  'Formato', 'Thumbnail', 'Áudio', 'Texto no criativo', 'Caption',
  'Produto em destaque', 'Prova social', 'Urgência',
]

interface Props {
  customerId: string
  creatives?: Creative[]
}

export default function NewCreativeForm({ customerId, creatives = [] }: Props) {
  const router = useRouter()
  const { success, error } = useToast()
  const [isPending, startTransition] = useTransition()
  const [stage, setStage] = useState<CreativeStage | ''>('')
  const [variationAspects, setVariationAspects] = useState<string[]>([])
  const [aspectInput, setAspectInput] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const explorationCreatives = creatives.filter(c => c.stage === 'exploration')

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

    const title = data.get('title') as string
    const type = data.get('type') as string
    const caption = (data.get('caption') as string) || undefined
    const textInCreative = (data.get('textInCreative') as string) || undefined
    const designDescription = (data.get('designDescription') as string) || undefined
    const objective = (data.get('objective') as string) || undefined
    const parentCreativeId = (data.get('parentCreativeId') as string) || undefined
    const file = fileRef.current?.files?.[0]

    if (!title || !type) return

    startTransition(async () => {
      const createResult = await createCreative(customerId, {
        title,
        type,
        stage: stage || undefined,
        parentCreativeId,
        variationAspects: variationAspects.length > 0 ? variationAspects : undefined,
        caption,
        textInCreative,
        designDescription,
        objective,
      })

      if (createResult.message) {
        error(createResult.message)
        return
      }

      const creativeId = createResult.creativeId!

      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        const uploadResult = await uploadCreativeFile(customerId, creativeId, fd)
        if (uploadResult.message) {
          error(`Criativo criado, mas falha no upload: ${uploadResult.message}`)
          router.push(`/customers/${customerId}/creatives`)
          return
        }
      }

      success('Criativo criado com sucesso.')
      router.push(`/customers/${customerId}/creatives`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-5">
      <h3 className="text-sm font-semibold text-hi">Novo Criativo</h3>

      {/* Stage selector */}
      <div>
        <label className="block text-xs font-medium text-lo mb-2">Etapa</label>
        <div className="flex flex-wrap gap-2">
          {STAGES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStage(prev => prev === s.value ? '' : s.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-all ${
                stage === s.value
                  ? s.color
                  : 'bg-elevated text-md ring-border hover:text-hi'
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

          <div>
            <label className="block text-xs font-medium text-lo mb-1">Criativo de origem (Exploração)</label>
            <select
              name="parentCreativeId"
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
              defaultValue=""
            >
              <option value="">Selecione o criativo de origem</option>
              {explorationCreatives.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-lo mb-2">O que está sendo variado</label>
            {/* Tags selecionadas */}
            {variationAspects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {variationAspects.map(a => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-300 ring-1 ring-violet-500/20"
                  >
                    {a}
                    <button
                      type="button"
                      onClick={() => removeAspect(a)}
                      className="ml-0.5 hover:text-white transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Sugestões */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {VARIATION_SUGGESTIONS.filter(s => !variationAspects.includes(s)).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addAspect(s)}
                  className="rounded-full bg-elevated px-2.5 py-0.5 text-xs text-md hover:text-hi hover:bg-border transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
            {/* Input customizado */}
            <input
              value={aspectInput}
              onChange={e => setAspectInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); addAspect(aspectInput) }
              }}
              placeholder="Novo tipo... (Enter para adicionar)"
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>
        </div>
      )}

      {/* Main fields */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Título *</label>
          <input
            name="title"
            required
            placeholder="ex: Anúncio de Lançamento — Fundo Branco"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Tipo *</label>
          <select
            name="type"
            required
            defaultValue=""
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="" disabled>Selecione</option>
            {TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

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

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Texto no criativo</label>
          <input
            name="textInCreative"
            placeholder="ex: DESCONTO 30% • Aproveite agora"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <p className="mt-1 text-xs text-lo">Headline ou CTA sobreposto visualmente no criativo</p>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Caption</label>
          <textarea
            name="caption"
            rows={2}
            placeholder="Texto da legenda do anúncio"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Descrição do design</label>
          <textarea
            name="designDescription"
            rows={2}
            placeholder="ex: Imagem grande, produto em destaque, fundo branco, texto curto"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
          />
          <p className="mt-1 text-xs text-lo">Descreva o estilo/conceito — será usado para análise de padrões</p>
        </div>

        {/* File upload */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Arquivo (opcional)</label>
          <label className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-canvas px-4 py-3 cursor-pointer hover:border-accent/50 hover:bg-elevated transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lo shrink-0">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-sm text-md">
              {fileName ? (
                <span className="text-hi">{fileName}</span>
              ) : (
                <span>Clique para selecionar imagem ou vídeo</span>
              )}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={e => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
          <p className="mt-1 text-xs text-lo">Será enviado para a pasta do cliente no Google Drive</p>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.push(`/customers/${customerId}/creatives`)}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-md hover:bg-elevated transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? (fileName ? 'Criando e enviando...' : 'Criando...') : 'Criar Criativo'}
        </button>
      </div>
    </form>
  )
}
