'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
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

  // Prevent browser from opening dropped files outside the zone
  useEffect(() => {
    function prevent(e: DragEvent) {
      e.preventDefault()
    }
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])

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
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
            ? 'border-indigo-400 bg-indigo-50'
            : selectedFile
              ? 'border-green-300 bg-green-50'
              : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'
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
              <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
              <p className="text-xs text-slate-500">{formatBytes(selectedFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (inputRef.current) inputRef.current.value = '' }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Trocar arquivo
            </button>
          </>
        ) : (
          <>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">
                Arraste o arquivo ou <span className="text-indigo-600">clique para selecionar</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">PDF, Word, Excel, PNG, JPG</p>
            </div>
          </>
        )}
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700" htmlFor="doc-title">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            id="doc-title"
            name="title"
            type="text"
            required
            placeholder="Ex: Contrato de Prestação de Serviços"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {state?.errors?.title && (
            <p className="text-xs text-red-600">{state.errors.title[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700" htmlFor="doc-type">
            Tipo <span className="text-red-500">*</span>
          </label>
          <select
            id="doc-type"
            name="type"
            required
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Selecione...</option>
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {state?.errors?.type && (
            <p className="text-xs text-red-600">{state.errors.type[0]}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700" htmlFor="doc-notes">
          Observações
        </label>
        <textarea
          id="doc-notes"
          name="notes"
          rows={2}
          placeholder="Notas opcionais sobre este documento..."
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={pending || !selectedFile}
        className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
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
