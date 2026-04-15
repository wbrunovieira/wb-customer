'use client'

import { useTransition, useRef } from 'react'
import { uploadCreativeFile } from '@/app/actions/creatives'
import { useToast } from '@/components/toast/toast-context'

interface Props {
  customerId: string
  creativeId: string
  hasFile: boolean
}

export default function UploadCreativeFile({ customerId, creativeId, hasFile }: Props) {
  const { success, error } = useToast()
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    startTransition(async () => {
      const result = await uploadCreativeFile(customerId, creativeId, formData)
      if (result.message) {
        error(result.message)
      } else {
        success('Arquivo enviado com sucesso.')
      }
    })
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleUpload}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-hi transition-colors hover:bg-elevated disabled:opacity-50"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {isPending ? 'Enviando...' : hasFile ? 'Substituir' : 'Upload'}
      </button>
    </>
  )
}
