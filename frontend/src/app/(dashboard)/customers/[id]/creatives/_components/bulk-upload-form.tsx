'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Creative, CreativeStage } from '@/lib/definitions'
import { createCreative, uploadCreativeFile, deleteCreative } from '@/app/actions/creatives'
import { useToast } from '@/components/toast/toast-context'
import LoadingDots from '@/components/ui/loading-dots'

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

interface FileItem {
  file: File
  title: string
  status: 'pending' | 'creating' | 'uploading' | 'done' | 'error'
  error?: string
}

interface Props {
  customerId: string
  creatives?: Creative[]
}

function baseName(file: File) {
  return file.name.replace(/\.[^/.]+$/, '')
}

export default function BulkUploadForm({ customerId, creatives = [] }: Props) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // Shared fields
  const [stage, setStage] = useState<CreativeStage | ''>('')
  const [type, setType] = useState('image')
  const [objective, setObjective] = useState('')
  const [caption, setCaption] = useState('')
  const [textInCreative, setTextInCreative] = useState('')
  const [designDescription, setDesignDescription] = useState('')
  const [variationAspects, setVariationAspects] = useState<string[]>([])
  const [aspectInput, setAspectInput] = useState('')
  const [parentCreativeId, setParentCreativeId] = useState('')

  // File list
  const [items, setItems] = useState<FileItem[]>([])

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    setItems(prev => [
      ...prev,
      ...selected.map(f => ({ file: f, title: baseName(f), status: 'pending' as const })),
    ])
    // reset input so same files can be re-added if needed
    e.target.value = ''
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function updateTitle(index: number, value: string) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, title: value } : item))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) return

    startTransition(async () => {
      const updated = [...items]
      let hasError = false

      for (let i = 0; i < updated.length; i++) {
        const item = updated[i]

        updated[i] = { ...item, status: 'creating' }
        setItems([...updated])

        const createResult = await createCreative(customerId, {
          title: item.title || baseName(item.file),
          type,
          stage: stage || undefined,
          parentCreativeId: parentCreativeId || undefined,
          variationAspects: variationAspects.length > 0 ? variationAspects : undefined,
          caption: caption || undefined,
          textInCreative: textInCreative || undefined,
          designDescription: designDescription || undefined,
          objective: objective || undefined,
        })

        if (createResult.message || !createResult.creativeId) {
          updated[i] = { ...updated[i], status: 'error', error: createResult.message ?? 'Erro ao criar' }
          setItems([...updated])
          hasError = true
          continue
        }

        const creativeId = createResult.creativeId

        updated[i] = { ...updated[i], status: 'uploading' }
        setItems([...updated])

        const fd = new FormData()
        fd.append('file', item.file)
        const uploadResult = await uploadCreativeFile(customerId, creativeId, fd)

        if (uploadResult.message) {
          await deleteCreative(customerId, creativeId)
          updated[i] = { ...updated[i], status: 'error', error: `Upload falhou: ${uploadResult.message}` }
          setItems([...updated])
          hasError = true
          continue
        }

        updated[i] = { ...updated[i], status: 'done' }
        setItems([...updated])
      }

      const doneCount = updated.filter(f => f.status === 'done').length
      if (hasError) {
        toastError(`${doneCount} criado${doneCount !== 1 ? 's' : ''}, alguns falharam.`)
      } else {
        success(`${doneCount} criativo${doneCount !== 1 ? 's' : ''} criado${doneCount !== 1 ? 's' : ''} com sucesso.`)
        router.push(`/customers/${customerId}/creatives`)
      }
    })
  }

  const doneCount = items.filter(f => f.status === 'done').length
  const errorCount = items.filter(f => f.status === 'error').length
  const allSettled = items.length > 0 && doneCount + errorCount === items.length

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold text-hi">Upload em Lote</h3>
        <p className="text-xs text-lo mt-0.5">Preencha os campos compartilhados e selecione os arquivos. O título pode ser ajustado por arquivo.</p>
      </div>

      {/* Stage */}
      <div>
        <label className="block text-xs font-medium text-lo mb-2">Etapa</label>
        <div className="flex flex-wrap gap-2">
          {STAGES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStage(prev => prev === s.value ? '' : s.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-all ${
                stage === s.value ? s.color : 'bg-elevated text-md ring-border hover:text-hi'
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
                value={parentCreativeId}
                onChange={e => setParentCreativeId(e.target.value)}
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

      {/* Shared fields */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-lo mb-1">Tipo *</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            {TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Objetivo</label>
          <select
            value={objective}
            onChange={e => setObjective(e.target.value)}
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
            value={textInCreative}
            onChange={e => setTextInCreative(e.target.value)}
            placeholder="ex: DESCONTO 30% • Aproveite agora"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Caption</label>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            rows={2}
            placeholder="Texto da legenda do anúncio"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Descrição do design</label>
          <textarea
            value={designDescription}
            onChange={e => setDesignDescription(e.target.value)}
            rows={2}
            placeholder="ex: Imagem grande, produto em destaque, fundo branco, texto curto"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
          />
        </div>
      </div>

      {/* File drop zone */}
      <div>
        <label className="block text-xs font-medium text-lo mb-1">Arquivos *</label>
        <label className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-canvas px-4 py-3 cursor-pointer hover:border-accent/50 hover:bg-elevated transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lo shrink-0">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="text-sm text-md">
            {items.length > 0
              ? <span className="text-hi">{items.length} arquivo{items.length > 1 ? 's' : ''} selecionado{items.length > 1 ? 's' : ''} — clique para adicionar mais</span>
              : <span>Clique para selecionar imagens ou vídeos</span>
            }
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={isPending}
          />
        </label>
      </div>

      {/* File list with editable titles */}
      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg border border-border bg-canvas px-3 py-2.5">
              {/* Status icon */}
              <div className="shrink-0">
                {item.status === 'pending' && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lo">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                )}
                {(item.status === 'creating' || item.status === 'uploading') && (
                  <LoadingDots />
                )}
                {item.status === 'done' && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                {item.status === 'error' && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                )}
              </div>

              {/* Editable title + filename */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                {item.status === 'pending' ? (
                  <input
                    value={item.title}
                    onChange={e => updateTitle(i, e.target.value)}
                    placeholder="Título do criativo"
                    className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs font-medium text-hi placeholder:text-lo focus:outline-none focus:border-border focus:bg-elevated transition-colors"
                  />
                ) : (
                  <p className="text-xs font-medium text-hi truncate px-1">{item.title}</p>
                )}
                <p className="text-xs text-lo truncate px-1">
                  {item.status === 'creating' && 'Criando...'}
                  {item.status === 'uploading' && 'Enviando para o Drive...'}
                  {item.status === 'done' && <span className="text-green-400">Concluído</span>}
                  {item.status === 'error' && <span className="text-red-400">{item.error}</span>}
                  {item.status === 'pending' && item.file.name}
                </p>
              </div>

              {/* Remove */}
              {item.status === 'pending' && !isPending && (
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="shrink-0 text-lo hover:text-hi transition-colors"
                  aria-label="Remover"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isPending && (
        <p className="text-xs text-lo text-center">
          {doneCount} de {items.length} concluídos{errorCount > 0 ? ` · ${errorCount} com erro` : ''}
        </p>
      )}

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.push(`/customers/${customerId}/creatives`)}
          disabled={isPending && !allSettled}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-md hover:bg-elevated transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending || items.length === 0}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending
            ? `Criando ${doneCount + errorCount}/${items.length}...`
            : `Criar ${items.length > 0 ? `${items.length} criativo${items.length > 1 ? 's' : ''}` : 'criativos'}`}
        </button>
      </div>
    </form>
  )
}
