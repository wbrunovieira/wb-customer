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
        <p className="text-xs text-red-600">{(state as { message: string }).message}</p>
      )}
      {(state as { success?: boolean } | undefined)?.success && (
        <p className="text-xs text-green-600">Resumo salvo.</p>
      )}
      <textarea
        name="summary"
        rows={4}
        defaultValue={currentSummary ?? ''}
        placeholder="Escreva o resumo da reunião, próximos passos, decisões tomadas..."
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-50"
      >
        {pending ? 'Salvando...' : 'Salvar resumo'}
      </button>
    </form>
  )
}
