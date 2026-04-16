'use client'

import { useState, useEffect, useCallback } from 'react'
import { Creative, CreativeType, CreativeStage, PaginatedResponse } from '@/lib/definitions'
import LoadingDots from '@/components/ui/loading-dots'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003'

const TYPE_LABEL: Record<CreativeType, string> = {
  image: 'Imagem',
  video: 'Vídeo',
  carousel: 'Carrossel',
}

const TYPE_COLOR: Record<CreativeType, string> = {
  image: 'bg-sky-500/10 text-sky-400',
  video: 'bg-violet-500/10 text-violet-400',
  carousel: 'bg-amber-500/10 text-amber-400',
}

const STAGE_LABEL: Record<CreativeStage, string> = {
  exploration: 'Exploração',
  refinement: 'Lapidação',
  scale: 'Escala',
}

function getThumbUrl(c: Creative): string | null {
  if (c.thumbnailUrl) return c.thumbnailUrl
  if (c.driveFileId) return `https://drive.google.com/thumbnail?id=${c.driveFileId}&sz=w300-h200`
  return null
}

interface Props {
  customerId: string
  value: string | null
  onChange: (creativeId: string | null, creative: Creative | null) => void
  selectedCreative?: Creative | null
}

export default function CreativePicker({ customerId, value, onChange, selectedCreative }: Props) {
  const [open, setOpen] = useState(false)
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [loading, setLoading] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`${BASE_URL}/api/v1/customers/${customerId}/creatives?limit=50`, {
      credentials: 'include',
    })
      .then(r => r.json())
      .then((data: PaginatedResponse<Creative>) => {
        setCreatives(data.items ?? [])
      })
      .catch(() => setCreatives([]))
      .finally(() => setLoading(false))
  }, [open, customerId])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, close])

  const thumbUrl = selectedCreative ? getThumbUrl(selectedCreative) : null

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-md hover:border-accent/50 hover:text-hi transition-colors"
        >
          {value && thumbUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbUrl}
                alt={selectedCreative?.title ?? 'Criativo'}
                className="h-8 w-8 rounded object-cover"
              />
              <span className="text-hi line-clamp-1 max-w-[180px]">{selectedCreative?.title}</span>
            </>
          ) : value ? (
            <span className="text-hi">Criativo selecionado</span>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Selecionar Criativo
            </>
          )}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null, null)}
            className="text-xs text-lo hover:text-red-400 transition-colors"
          >
            Remover
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative w-full max-w-3xl max-h-[80vh] flex flex-col rounded-2xl border border-border bg-surface shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold text-hi">Selecionar Criativo</h3>
              <button
                type="button"
                onClick={close}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated text-md hover:text-hi transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingDots className="scale-150 text-accent" />
                </div>
              ) : creatives.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <p className="text-sm text-lo">Nenhum criativo encontrado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {creatives.map(c => {
                    const thumb = getThumbUrl(c)
                    const isSelected = c.id === value
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          onChange(c.id, c)
                          close()
                        }}
                        className={`relative flex flex-col rounded-xl border overflow-hidden text-left transition-all hover:border-accent/50 ${
                          isSelected ? 'border-accent bg-accent/5' : 'border-border bg-elevated'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="h-32 w-full bg-canvas flex items-center justify-center overflow-hidden">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt={c.title} className="h-full w-full object-contain" />
                          ) : (
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lo">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          )}
                        </div>

                        <div className="p-2.5 flex flex-col gap-1">
                          <p className="text-xs font-medium text-hi line-clamp-2 leading-snug">{c.title}</p>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${TYPE_COLOR[c.type]}`}>
                              {TYPE_LABEL[c.type]}
                            </span>
                            {c.stage && (
                              <span className="rounded-full bg-canvas px-1.5 py-0.5 text-xs text-lo">
                                {STAGE_LABEL[c.stage]}
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
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
          </div>
        </div>
      )}
    </>
  )
}
