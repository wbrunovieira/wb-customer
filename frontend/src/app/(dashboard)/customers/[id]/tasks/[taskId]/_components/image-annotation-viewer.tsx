'use client'

import { useState, useRef, useTransition } from 'react'
import { ImageAnnotation } from '@/lib/definitions'
import { addImageAnnotation } from '@/app/actions/tasks'

type Props = {
  customerId: string
  taskId: string
  commentId: string
  imageUrl: string
  annotations: ImageAnnotation[]
}

export default function ImageAnnotationViewer({
  customerId,
  taskId,
  commentId,
  imageUrl,
  annotations,
}: Props) {
  const [annotating, setAnnotating] = useState(false)
  const [pending, startTransition] = useTransition()
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null)
  const [pinText, setPinText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const imgRef = useRef<HTMLDivElement>(null)

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!annotating || pending) return
    const rect = imgRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setPendingPin({ x, y })
    setPinText('')
    setError(null)
  }

  function submitAnnotation() {
    if (!pendingPin || !pinText.trim()) {
      setError('Escreva uma anotação')
      return
    }
    startTransition(async () => {
      const result = await addImageAnnotation(
        customerId, taskId, commentId, imageUrl,
        pendingPin.x, pendingPin.y, pinText.trim(),
      )
      if ('message' in result) {
        setError(result.message)
      } else {
        setPendingPin(null)
        setPinText('')
        setAnnotating(false)
      }
    })
  }

  return (
    <div className="mt-2">
      {/* Image + overlay */}
      <div
        ref={imgRef}
        className={`relative inline-block max-w-full rounded-lg overflow-hidden border border-border ${annotating ? 'cursor-crosshair' : ''}`}
        onClick={handleImageClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Imagem anexada"
          className="block max-w-full max-h-64 object-contain select-none"
          draggable={false}
        />

        {/* Existing annotation pins */}
        {annotations.map((ann) => (
          <div
            key={ann.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${ann.x * 100}%`, top: `${ann.y * 100}%` }}
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full btn-brand text-[10px] font-bold text-white shadow ring-2 ring-white">
              {ann.number}
            </div>
            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden min-w-[120px] max-w-[200px] rounded-lg border border-border bg-surface px-2 py-1 text-xs text-hi shadow-lg group-hover:block">
              <span className="font-semibold text-accent">#{ann.number}</span>{' '}{ann.text}
            </div>
          </div>
        ))}

        {/* Pending pin while in annotation mode */}
        {pendingPin && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pendingPin.x * 100}%`, top: `${pendingPin.y * 100}%` }}
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/100 text-[10px] font-bold text-white shadow ring-2 ring-white">
              +
            </div>
          </div>
        )}
      </div>

      {/* Annotation legend */}
      {annotations.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-0.5">
          {annotations.map((ann) => (
            <div key={ann.id} className="flex items-start gap-1.5 text-xs text-md">
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-400">
                {ann.number}
              </span>
              <span>{ann.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Annotation mode controls */}
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setAnnotating((v) => !v); setPendingPin(null) }}
          className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
            annotating
              ? 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-400'
              : 'bg-elevated text-md hover:bg-elevated'
          }`}
        >
          {annotating ? 'Clique na imagem para anotar' : '+ Anotar'}
        </button>
        {annotating && (
          <button
            type="button"
            onClick={() => { setAnnotating(false); setPendingPin(null) }}
            className="text-xs text-lo hover:text-md"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Text input for pending pin */}
      {pendingPin && (
        <div className="mt-2 flex flex-col gap-1.5">
          <input
            type="text"
            value={pinText}
            onChange={(e) => setPinText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitAnnotation() }}
            placeholder="Descreva o ponto anotado..."
            autoFocus
            className="w-full rounded-lg border border-border-strong bg-elevated px-3 py-1.5 text-xs text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitAnnotation}
              disabled={pending}
              className="rounded-lg btn-brand px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              {pending ? '...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => setPendingPin(null)}
              className="rounded-lg border border-border px-3 py-1 text-xs text-md hover:bg-elevated"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
