'use client'

import { useTransition } from 'react'
import { deleteCreative } from '@/app/actions/creatives'
import { useToast } from '@/components/toast/toast-context'

interface Props {
  customerId: string
  creativeId: string
  title: string
}

export default function DeleteCreativeButton({ customerId, creativeId, title }: Props) {
  const { confirm, success, error } = useToast()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    confirm({
      message: `Excluir "${title}"?`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        startTransition(async () => {
          try {
            await deleteCreative(customerId, creativeId)
            success('Criativo excluído.')
          } catch {
            error('Não foi possível excluir o criativo.')
          }
        })
      },
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1 text-xs text-lo hover:text-red-400 transition-colors disabled:opacity-50"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
      Excluir
    </button>
  )
}
