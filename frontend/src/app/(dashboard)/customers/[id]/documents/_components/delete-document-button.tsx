'use client'

import { deleteDocument } from '@/app/actions/documents'

type Props = {
  customerId: string
  documentId: string
  title: string
}

export default function DeleteDocumentButton({ customerId, documentId, title }: Props) {
  async function handleDelete() {
    if (!confirm(`Excluir o documento "${title}"?`)) return
    await deleteDocument(customerId, documentId)
  }

  return (
    <button
      onClick={handleDelete}
      className="rounded px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50"
    >
      Excluir
    </button>
  )
}
