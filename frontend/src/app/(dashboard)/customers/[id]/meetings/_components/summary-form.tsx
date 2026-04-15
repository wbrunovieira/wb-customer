'use client'

import { useActionState } from 'react'
import { updateMeetingSummary } from '@/app/actions/meetings'

type Props = {
  customerId: string
  meetingId: string
  currentSummary: string | null
}

export default function SummaryForm({ customerId, meetingId, currentSummary }: Props) {
  const action = updateMeetingSummary.bind(null, customerId, meetingId)
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {(state as { message?: string } | undefined)?.message && (
        <p className="text-xs text-red-400">{(state as { message: string }).message}</p>
      )}
      {(state as { success?: boolean } | undefined)?.success && (
        <p className="text-xs text-green-400">Resumo salvo.</p>
      )}
      <textarea
        name="summary"
        rows={4}
        defaultValue={currentSummary ?? ''}
        placeholder="Escreva o resumo da reunião, próximos passos, decisões tomadas..."
        className="w-full rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1//"
      />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg btn-brand px-3 py-1.5 text-xs font-medium disabled:opacity-50"
      >
        {pending ? 'Salvando...' : 'Salvar resumo'}
      </button>
    </form>
  )
}
