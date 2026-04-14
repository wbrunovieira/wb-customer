'use client'

import { useTransition } from 'react'
import { cancelMeeting } from '@/app/actions/meetings'

type Props = { customerId: string; meetingId: string }

export default function CancelMeetingButton({ customerId, meetingId }: Props) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm('Cancelar esta reunião? O evento será removido do Google Calendar.')) return
    startTransition(() => cancelMeeting(customerId, meetingId))
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
