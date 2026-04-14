'use client'

import { updateDocumentStatus } from '@/app/actions/documents'
import { DocumentStatus } from '@/lib/definitions'

const STATUS_OPTIONS: { value: DocumentStatus; label: string }[] = [
  { value: 'pending_signature', label: 'Aguardando assinatura' },
  { value: 'signed', label: 'Assinado' },
  { value: 'expired', label: 'Expirado' },
  { value: 'cancelled', label: 'Cancelado' },
]

type Props = {
  customerId: string
  documentId: string
  currentStatus: DocumentStatus
}

export default function DocumentStatusSelect({ customerId, documentId, currentStatus }: Props) {
  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    await updateDocumentStatus(customerId, documentId, e.target.value)
  }

  return (
    <select
      defaultValue={currentStatus}
      onChange={handleChange}
      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
