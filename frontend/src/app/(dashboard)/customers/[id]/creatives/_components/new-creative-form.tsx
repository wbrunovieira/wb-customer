'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
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

interface CreativeEntry {
  key: string
  file: File | null
  previewUrl: string | null
  title: string
  type: string
  stage: CreativeStage | ''
  objective: string
  caption: string
  textInCreative: string
  designDescription: string
  variationAspects: string[]
  parentCreativeId: string
  expanded: boolean
  status: 'idle' | 'creating' | 'uploading' | 'done' | 'error'
  error?: string
}

interface Props {
  customerId: string
  creatives?: Creative[]
}

function baseName(file: File) {
  return file.name.replace(/\.[^/.]+$/, '')
}

function emptyEntry(key: string): CreativeEntry {
  return {
    key, file: null, previewUrl: null, title: '', type: 'image',
    stage: '', objective: '', caption: '', textInCreative: '',
    designDescription: '', variationAspects: [], parentCreativeId: '',
    expanded: false, status: 'idle',
  }
}

function cloneEntry(src: CreativeEntry, key: string): CreativeEntry {
  return {
    ...src,
    key, file: null, previewUrl: null, title: '',
    status: 'idle', error: undefined, expanded: false,
  }
}

let _keyCounter = 0
function nextKey() { return String(++_keyCounter) }

export default function NewCreativeForm({ customerId, creatives = [] }: Props) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [isPending, startTransition] = useTransition()
  const [entries, setEntries] = useState<CreativeEntry[]>([emptyEntry(nextKey())])
  const multiFileRef = useRef<HTMLInputElement>(null)

  const explorationCreatives = creatives.filter(c => c.stage === 'exploration')

  // ── entry field helpers ──────────────────────────────────────────────────
  const update = useCallback(<K extends keyof CreativeEntry>(key: string, field: K, value: CreativeEntry[K]) => {
    setEntries(prev => prev.map(e => e.key === key ? { ...e, [field]: value } : e))
  }, [])

  function setFile(key: string, file: File | null) {
    setEntries(prev => prev.map(e => {
      if (e.key !== key) return e
      if (e.previewUrl) URL.revokeObjectURL(e.previewUrl)
      const previewUrl = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      return { ...e, file, previewUrl, title: e.title || (file ? baseName(file) : '') }
    }))
  }

  function addAspect(key: string, val: string) {
    const trimmed = val.trim()
    if (!trimmed) return
    setEntries(prev => prev.map(e => {
      if (e.key !== key || e.variationAspects.includes(trimmed)) return e
      return { ...e, variationAspects: [...e.variationAspects, trimmed] }
    }))
  }

  function removeAspect(key: string, aspect: string) {
    setEntries(prev => prev.map(e =>
      e.key === key ? { ...e, variationAspects: e.variationAspects.filter(a => a !== aspect) } : e
    ))
  }

  // ── add / remove entries ─────────────────────────────────────────────────
  function addEntry() {
    const last = entries[entries.length - 1]
    setEntries(prev => [...prev, cloneEntry(last, nextKey())])
  }

  function removeEntry(key: string) {
    setEntries(prev => {
      const e = prev.find(x => x.key === key)
      if (e?.previewUrl) URL.revokeObjectURL(e.previewUrl)
      const next = prev.filter(x => x.key !== key)
      return next.length > 0 ? next : [emptyEntry(nextKey())]
    })
  }

  // ── multi-file selection → auto-creates entries ──────────────────────────
  function handleMultiFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const template = entries[entries.length - 1]
    const newEntries = files.map(file => {
      const entry = cloneEntry(template, nextKey())
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      return { ...entry, file, previewUrl, title: baseName(file) }
    })
    // if only entry is blank, replace it; otherwise append
    const isBlank = entries.length === 1 && !entries[0].file && !entries[0].title
    setEntries(isBlank ? newEntries : [...entries, ...newEntries])
    e.target.value = ''
  }

  // ── submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (entries.some(en => !en.file || !en.title)) return

    startTransition(async () => {
      let updated = [...entries]
      let hasError = false

      for (let i = 0; i < updated.length; i++) {
        const en = updated[i]

        updated[i] = { ...en, status: 'creating' }
        setEntries([...updated])

        const createResult = await createCreative(customerId, {
          title: en.title,
          type: en.type,
          stage: en.stage || undefined,
          parentCreativeId: en.parentCreativeId || undefined,
          variationAspects: en.variationAspects.length > 0 ? en.variationAspects : undefined,
          caption: en.caption || undefined,
          textInCreative: en.textInCreative || undefined,
          designDescription: en.designDescription || undefined,
          objective: en.objective || undefined,
        })

        if (createResult.message || !createResult.creativeId) {
          updated[i] = { ...updated[i], status: 'error', error: createResult.message ?? 'Erro ao criar' }
          setEntries([...updated])
          hasError = true
          continue
        }

        const creativeId = createResult.creativeId

        updated[i] = { ...updated[i], status: 'uploading' }
        setEntries([...updated])

        const fd = new FormData()
        fd.append('file', en.file!)
        const uploadResult = await uploadCreativeFile(customerId, creativeId, fd)

        if (uploadResult.message) {
          await deleteCreative(customerId, creativeId)
          updated[i] = { ...updated[i], status: 'error', error: `Upload falhou: ${uploadResult.message}` }
          setEntries([...updated])
          hasError = true
          continue
        }

        updated[i] = { ...updated[i], status: 'done' }
        setEntries([...updated])
      }

      const doneCount = updated.filter(x => x.status === 'done').length
      if (hasError) {
        toastError(`${doneCount} criado${doneCount !== 1 ? 's' : ''}, alguns falharam.`)
      } else {
        success(`${doneCount} criativo${doneCount !== 1 ? 's' : ''} criado${doneCount !== 1 ? 's' : ''} com sucesso.`)
        router.push(`/customers/${customerId}/creatives`)
      }
    })
  }

  const doneCount = entries.filter(e => e.status === 'done').length
  const allReady = entries.every(e => e.file && e.title)

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-3">
        <div>
          <p className="text-sm font-semibold text-hi">Novo{entries.length > 1 ? `s ${entries.length} Criativos` : ' Criativo'}</p>
          <p className="text-xs text-lo mt-0.5">Preencha os campos de cada criativo. Novos herdam as configurações do anterior.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Multi-file shortcut */}
          <label className="flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-md cursor-pointer hover:text-hi transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Selecionar arquivos
            <input ref={multiFileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMultiFiles} disabled={isPending} />
          </label>
          <button
            type="button"
            onClick={addEntry}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-md hover:text-hi transition-colors disabled:opacity-50"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Adicionar
          </button>
        </div>
      </div>

      {/* Entry cards */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {entries.map((en, idx) => (
          <EntryCard
            key={en.key}
            entry={en}
            index={idx}
            total={entries.length}
            explorationCreatives={explorationCreatives}
            isPending={isPending}
            onUpdate={update}
            onSetFile={setFile}
            onAddAspect={addAspect}
            onRemoveAspect={removeAspect}
            onRemove={() => removeEntry(en.key)}
            onToggleExpanded={() => update(en.key, 'expanded', !en.expanded)}
          />
        ))}

        {isPending && (
          <p className="text-xs text-lo text-center py-1">
            {doneCount} de {entries.length} concluídos
          </p>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <button
            type="button"
            onClick={() => router.push(`/customers/${customerId}/creatives`)}
            disabled={isPending}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-md hover:bg-elevated transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || !allReady}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending
              ? `Criando ${doneCount}/${entries.length}...`
              : entries.length > 1 ? `Criar ${entries.length} criativos` : 'Criar Criativo'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── EntryCard ────────────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: CreativeEntry
  index: number
  total: number
  explorationCreatives: Creative[]
  isPending: boolean
  onUpdate: <K extends keyof CreativeEntry>(key: string, field: K, value: CreativeEntry[K]) => void
  onSetFile: (key: string, file: File | null) => void
  onAddAspect: (key: string, val: string) => void
  onRemoveAspect: (key: string, aspect: string) => void
  onRemove: () => void
  onToggleExpanded: () => void
}

function EntryCard({
  entry, index, total, explorationCreatives, isPending,
  onUpdate, onSetFile, onAddAspect, onRemoveAspect, onRemove, onToggleExpanded,
}: EntryCardProps) {
  const [aspectInput, setAspectInput] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const isProcessing = entry.status === 'creating' || entry.status === 'uploading'

  const statusIcon = {
    idle: null,
    creating: <LoadingDots />,
    uploading: <LoadingDots />,
    done: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><polyline points="20 6 9 17 4 12"/></svg>,
    error: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  }[entry.status]

  return (
    <div className={`rounded-xl border bg-surface overflow-hidden transition-colors ${
      entry.status === 'done' ? 'border-green-600/20' :
      entry.status === 'error' ? 'border-red-500/30' : 'border-border'
    }`}>
      {/* Top row: always visible */}
      <div className="flex gap-3 p-4">
        {/* File preview / selector */}
        <label className={`relative shrink-0 w-24 h-20 rounded-lg border border-dashed border-border bg-elevated flex items-center justify-center overflow-hidden ${!isProcessing ? 'cursor-pointer hover:border-accent/50 transition-colors' : ''}`}>
          {entry.previewUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entry.previewUrl} alt="" className="h-full w-full object-contain" />
              {!isProcessing && (
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-xs text-white font-medium">Trocar</span>
                </div>
              )}
            </>
          ) : entry.file ? (
            <div className="flex flex-col items-center gap-1 px-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lo">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              <span className="text-xs text-lo text-center leading-tight line-clamp-2">{entry.file.name}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lo">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span className="text-xs text-lo">Arquivo</span>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            disabled={isProcessing || entry.status === 'done'}
            onChange={e => {
              const f = e.target.files?.[0] ?? null
              onSetFile(entry.key, f)
              e.target.value = ''
            }}
          />
        </label>

        {/* Fields */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Title + index + status */}
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-lo font-medium w-5 text-right">{index + 1}.</span>
            <input
              value={entry.title}
              onChange={e => onUpdate(entry.key, 'title', e.target.value)}
              placeholder="Título do criativo *"
              disabled={isProcessing || entry.status === 'done'}
              className="flex-1 min-w-0 rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-60"
            />
            {statusIcon && <span className="shrink-0">{statusIcon}</span>}
            {total > 1 && entry.status === 'idle' && !isPending && (
              <button type="button" onClick={onRemove} className="shrink-0 text-lo hover:text-red-400 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Status text */}
          {entry.status === 'creating' && <p className="text-xs text-lo px-7">Criando criativo...</p>}
          {entry.status === 'uploading' && <p className="text-xs text-lo px-7">Enviando para o Drive...</p>}
          {entry.status === 'done' && <p className="text-xs text-green-400 px-7">Concluído</p>}
          {entry.status === 'error' && <p className="text-xs text-red-400 px-7">{entry.error}</p>}

          {/* Type + Stage (compact) */}
          {entry.status === 'idle' && (
            <div className="flex flex-wrap items-center gap-2 px-7">
              <select
                value={entry.type}
                onChange={e => onUpdate(entry.key, 'type', e.target.value)}
                className="rounded-md border border-border bg-canvas px-2 py-1 text-xs text-hi focus:outline-none focus:ring-1 focus:ring-accent/50"
              >
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div className="flex gap-1">
                {STAGES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => onUpdate(entry.key, 'stage', entry.stage === s.value ? '' : s.value)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-all ${
                      entry.stage === s.value ? s.color : 'bg-elevated text-lo ring-border hover:text-md'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onToggleExpanded}
                className="ml-auto text-xs text-lo hover:text-hi transition-colors flex items-center gap-1"
              >
                {entry.expanded ? 'Menos' : 'Mais campos'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${entry.expanded ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded fields */}
      {entry.expanded && entry.status === 'idle' && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border pt-4">
          {/* Refinement */}
          {entry.stage === 'refinement' && (
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 flex flex-col gap-3">
              <p className="text-xs text-violet-400 font-medium">Lapidação</p>
              {explorationCreatives.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-lo mb-1">Criativo de origem</label>
                  <select
                    value={entry.parentCreativeId}
                    onChange={e => onUpdate(entry.key, 'parentCreativeId', e.target.value)}
                    className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
                  >
                    <option value="">Selecione</option>
                    {explorationCreatives.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-lo mb-2">O que está sendo variado</label>
                {entry.variationAspects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {entry.variationAspects.map(a => (
                      <span key={a} className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-300 ring-1 ring-violet-500/20">
                        {a}
                        <button type="button" onClick={() => onRemoveAspect(entry.key, a)} className="ml-0.5 hover:text-white">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {VARIATION_SUGGESTIONS.filter(s => !entry.variationAspects.includes(s)).map(s => (
                    <button key={s} type="button" onClick={() => onAddAspect(entry.key, s)}
                      className="rounded-full bg-elevated px-2.5 py-0.5 text-xs text-md hover:text-hi hover:bg-border transition-colors">
                      + {s}
                    </button>
                  ))}
                </div>
                <input
                  value={aspectInput}
                  onChange={e => setAspectInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddAspect(entry.key, aspectInput); setAspectInput('') } }}
                  placeholder="Novo tipo... (Enter para adicionar)"
                  className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-lo mb-1">Objetivo</label>
              <select
                value={entry.objective}
                onChange={e => onUpdate(entry.key, 'objective', e.target.value)}
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <option value="">Nenhum</option>
                {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-lo mb-1">Texto no criativo</label>
              <input
                value={entry.textInCreative}
                onChange={e => onUpdate(entry.key, 'textInCreative', e.target.value)}
                placeholder="ex: DESCONTO 30%"
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-lo mb-1">Caption</label>
              <textarea
                value={entry.caption}
                onChange={e => onUpdate(entry.key, 'caption', e.target.value)}
                rows={2}
                placeholder="Texto da legenda do anúncio"
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-lo mb-1">Descrição do design</label>
              <textarea
                value={entry.designDescription}
                onChange={e => onUpdate(entry.key, 'designDescription', e.target.value)}
                rows={2}
                placeholder="ex: Imagem grande, produto em destaque, fundo branco"
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

