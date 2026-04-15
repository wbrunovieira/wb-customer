'use client'

import { useTransition } from 'react'
import { deleteDocument } from '@/app/actions/documents'
import { useToast } from '@/components/toast/toast-context'

type Props = {
  customerId: string
  documentId: string
  title: string
}

export default function DeleteDocumentButton({ customerId, documentId, title }: Props) {
  const { confirm, success, error } = useToast()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    confirm({
      message: `Excluir o documento "${title}"? O arquivo também será removido do Google Drive.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        startTransition(async () => {
          try {
            await deleteDocument(customerId, documentId)
            success(`Documento "${title}" excluído.`)
          } catch {
            error('Não foi possível excluir o documento.')
          }
        })
      },
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="rounded px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
    >
      {pending ? 'Excluindo...' : 'Excluir'}
    </button>
  )
}
