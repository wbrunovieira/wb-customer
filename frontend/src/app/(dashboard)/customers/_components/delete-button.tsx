'use client'

import { useTransition } from 'react'
import { deleteCustomer } from '@/app/actions/customers'
import { useToast } from '@/components/toast/toast-context'

type Props = {
  id: string
  name: string
}

export default function DeleteButton({ id, name }: Props) {
  const { confirm, success, error } = useToast()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    confirm({
      message: `Excluir o cliente "${name}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        startTransition(async () => {
          try {
            await deleteCustomer(id)
            success(`Cliente "${name}" excluído.`)
          } catch {
            error('Não foi possível excluir o cliente.')
          }
        })
      },
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="rounded-lg px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
    >
      {pending ? 'Excluindo...' : 'Excluir'}
    </button>
  )
}
