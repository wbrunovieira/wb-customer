'use client'

import { useTransition } from 'react'
import { cancelMeeting } from '@/app/actions/meetings'
import { useToast } from '@/components/toast/toast-context'

type Props = { customerId: string; meetingId: string }

export default function CancelMeetingButton({ customerId, meetingId }: Props) {
  const { confirm, success, error } = useToast()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    confirm({
      message: 'Cancelar esta reunião? O evento será removido do Google Calendar.',
      confirmLabel: 'Cancelar reunião',
      cancelLabel: 'Voltar',
      onConfirm: () => {
        startTransition(async () => {
          try {
            await cancelMeeting(customerId, meetingId)
            success('Reunião cancelada.')
          } catch {
            error('Não foi possível cancelar a reunião.')
          }
        })
      },
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-sm text-red-500 hover:underline disabled:opacity-50"
    >
      {pending ? 'Cancelando...' : 'Cancelar'}
    </button>
  )
}
