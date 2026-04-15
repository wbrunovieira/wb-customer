'use client'

import { useActionState, useRef, useState } from 'react'
import { uploadDocument } from '@/app/actions/documents'
import { DocumentFormState } from '@/lib/definitions'

type Props = {
  customerId: string
}

const DOC_TYPES = [
  { value: 'proposal', label: 'Proposta' },
  { value: 'contract', label: 'Contrato' },
  { value: 'addendum', label: 'Aditivo' },
  { value: 'other', label: 'Outro' },
]

export default function UploadZone({ customerId }: Props) {
  const action = uploadDocument.bind(null, customerId)
  const [state, formAction, pending] = useActionState<DocumentFormState, FormData>(action, undefined)
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)


  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setSelectedFile(file)
      if (inputRef.current) {
        const dt = new DataTransfer()
        dt.items.add(file)
        inputRef.current.files = dt.files
      }
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null)
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      {state?.message && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.message}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors ${
          dragging
            ? 'border-indigo-400 bg-indigo-500/10'
            : selectedFile
              ? 'border-green-300 bg-green-500/10'
              : 'border-border bg-canvas hover:border-indigo-300 hover:bg-brand/10/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFileChange}
        />
        {selectedFile ? (
          <>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium text-hi">{selectedFile.name}</p>
              <p className="text-xs text-md">{formatBytes(selectedFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (inputRef.current) inputRef.current.value = '' }}
              className="text-xs text-lo hover:text-md"
            >
              Trocar arquivo
            </button>
          </>
        ) : (
          <>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lo">
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium text-hi">
                Arraste o arquivo ou <span className="text-accent">clique para selecionar</span>
              </p>
              <p className="mt-1 text-xs text-lo">PDF, Word, Excel, PNG, JPG</p>
            </div>
          </>
        )}
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-hi" htmlFor="doc-title">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            id="doc-title"
            name="title"
            type="text"
            required
            placeholder="Ex: Contrato de Prestação de Serviços"
            className="rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
          />
          {state?.errors?.title && (
            <p className="text-xs text-red-400">{state.errors.title[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-hi" htmlFor="doc-type">
            Tipo <span className="text-red-500">*</span>
          </label>
          <select
            id="doc-type"
            name="type"
            required
            className="rounded-lg border border-border-strong bg-elevated px-3 py-2 text-sm text-hi focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
          >
            <option value="">Selecione...</option>
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {state?.errors?.type && (
            <p className="text-xs text-red-400">{state.errors.type[0]}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-hi" htmlFor="doc-notes">
          Observações
        </label>
        <textarea
          id="doc-notes"
          name="notes"
          rows={2}
          placeholder="Notas opcionais sobre este documento..."
          className="rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
        />
      </div>

      <button
        type="submit"
        disabled={pending || !selectedFile}
        className="flex items-center justify-center gap-2 rounded-lg btn-brand px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
      >
        {pending ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Enviando...
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
            Enviar documento
          </>
        )}
      </button>
    </form>
  )
}
