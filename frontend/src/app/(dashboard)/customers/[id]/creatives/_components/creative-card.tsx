'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Creative, CreativeType, CreativeStatus, CreativeStage } from '@/lib/definitions'
import UploadCreativeFile from './upload-creative-file'
import DeleteCreativeButton from './delete-creative-button'

const TYPE_LABEL: Record<CreativeType, string> = {
  image: 'Imagem', video: 'Vídeo', carousel: 'Carrossel',
}
const TYPE_COLOR: Record<CreativeType, string> = {
  image: 'bg-sky-500/10 text-sky-400',
  video: 'bg-violet-500/10 text-violet-400',
  carousel: 'bg-amber-500/10 text-amber-400',
}
const STATUS_LABEL: Record<CreativeStatus, string> = {
  draft: 'Rascunho', active: 'Ativo', paused: 'Pausado', archived: 'Arquivado',
}
const STATUS_COLOR: Record<CreativeStatus, string> = {
  draft: 'bg-canvas text-md ring-border',
  active: 'bg-green-500/10 text-green-400 ring-green-600/20',
  paused: 'bg-amber-500/10 text-amber-400 ring-amber-600/20',
  archived: 'bg-canvas text-lo ring-border',
}
const STAGE_LABEL: Record<CreativeStage, string> = {
  exploration: 'Exploração', refinement: 'Lapidação', scale: 'Escala',
}
const STAGE_COLOR: Record<CreativeStage, string> = {
  exploration: 'bg-sky-500/10 text-sky-400',
  refinement: 'bg-violet-500/10 text-violet-400',
  scale: 'bg-green-500/10 text-green-400',
}

function getThumbUrl(c: Creative): string | null {
  if (c.thumbnailUrl) return c.thumbnailUrl
  if (c.driveFileId) return `https://drive.google.com/thumbnail?id=${c.driveFileId}&sz=w400-h300`
  return null
}

function isVideo(c: Creative) {
  return c.mimeType?.startsWith('video/') || c.type === 'video'
}

interface Props {
  creative: Creative
  customerId: string
}

export default function CreativeCard({ creative, customerId }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const thumbUrl = getThumbUrl(creative)

  const close = useCallback(() => setLightboxOpen(false), [])

  useEffect(() => {
    if (!lightboxOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxOpen, close])

  return (
    <>
      <div className="group relative flex flex-col rounded-xl border border-border bg-surface overflow-hidden transition-shadow hover:shadow-md">
        {/* Thumbnail */}
        <div className="relative h-44 bg-elevated flex items-center justify-center overflow-hidden">
          {thumbUrl ? (
            <button
              type="button"
              onClick={() => !isVideo(creative) && setLightboxOpen(true)}
              className={`block h-full w-full ${!isVideo(creative) ? 'cursor-zoom-in' : 'cursor-default'}`}
              aria-label="Ver imagem"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbUrl}
                alt={creative.title}
                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
              {isVideo(creative) && creative.driveViewUrl && (
                <a
                  href={creative.driveViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-xs font-medium text-white ring-1 ring-white/20">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Abrir vídeo
                  </span>
                </a>
              )}
            </button>
          ) : creative.driveViewUrl ? (
            <a
              href={creative.driveViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 text-lo hover:text-accent transition-colors"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              <span className="text-xs">Ver no Drive</span>
            </a>
          ) : (
            <div className="flex flex-col items-center gap-2 text-lo">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span className="text-xs">Sem arquivo</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[creative.type]}`}>
              {TYPE_LABEL[creative.type]}
            </span>
            {creative.stage && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLOR[creative.stage]}`}>
                {STAGE_LABEL[creative.stage]}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-2 p-4 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/customers/${customerId}/creatives/${creative.id}`}
              className="text-sm font-medium text-hi hover:text-accent line-clamp-2 leading-snug"
            >
              {creative.title}
            </Link>
            <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_COLOR[creative.status]}`}>
              {STATUS_LABEL[creative.status]}
            </span>
          </div>

          {creative.designDescription && (
            <p className="text-xs text-md line-clamp-2 italic">{creative.designDescription}</p>
          )}

          {creative.variationAspects.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {creative.variationAspects.slice(0, 3).map(a => (
                <span key={a} className="rounded-full bg-elevated px-2 py-0.5 text-xs text-lo">{a}</span>
              ))}
              {creative.variationAspects.length > 3 && (
                <span className="rounded-full bg-elevated px-2 py-0.5 text-xs text-lo">+{creative.variationAspects.length - 3}</span>
              )}
            </div>
          )}

          <div className="mt-auto pt-3 flex items-center justify-between border-t border-border">
            <UploadCreativeFile customerId={customerId} creativeId={creative.id} hasFile={!!creative.driveFileId} />
            <div className="flex items-center gap-1">
              <Link
                href={`/customers/${customerId}/creatives/${creative.id}`}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-hi transition-colors hover:bg-elevated"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Editar
              </Link>
              <DeleteCreativeButton customerId={customerId} creativeId={creative.id} title={creative.title} />
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && thumbUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Fechar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={creative.driveFileId
              ? `https://drive.google.com/thumbnail?id=${creative.driveFileId}&sz=w1600`
              : thumbUrl}
            alt={creative.title}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
              {creative.title}
            </span>
            {creative.driveViewUrl && (
              <a
                href={creative.driveViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-black/60 px-3 py-1 text-xs text-white/80 hover:text-white backdrop-blur-sm transition-colors"
                onClick={e => e.stopPropagation()}
              >
                Abrir no Drive ↗
              </a>
            )}
          </div>
        </div>
      )}
    </>
  )
}
