'use client'

import { useTransition } from 'react'
import { deleteActivity } from '@/app/actions/activities'
import { useToast } from '@/components/toast/toast-context'

type Props = { customerId: string; activityId: string }

export default function DeleteActivityButton({ customerId, activityId }: Props) {
  const { confirm, success, error } = useToast()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    confirm({
      message: 'Excluir esta atividade?',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        startTransition(async () => {
          try {
            await deleteActivity(customerId, activityId)
            success('Atividade excluída.')
          } catch {
            error('Não foi possível excluir a atividade.')
          }
        })
      },
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-xs text-red-500 hover:underline disabled:opacity-50"
    >
      {pending ? 'Excluindo...' : 'Excluir'}
    </button>
  )
}
