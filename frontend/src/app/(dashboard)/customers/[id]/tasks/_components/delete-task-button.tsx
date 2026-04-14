'use client'

import { useTransition } from 'react'
import { deleteTask } from '@/app/actions/tasks'
import { useToast } from '@/components/toast/toast-context'

type Props = { customerId: string; taskId: string }

export default function DeleteTaskButton({ customerId, taskId }: Props) {
  const { confirm, success, error } = useToast()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    confirm({
      message: 'Excluir esta tarefa?',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        startTransition(async () => {
          try {
            await deleteTask(customerId, taskId)
            success('Tarefa excluída.')
          } catch {
            error('Não foi possível excluir a tarefa.')
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
