'use client'

import { useActionState, useState } from 'react'
import { createActivity } from '@/app/actions/activities'

type Props = {
  customerId: string
  onSuccess?: () => void
}

export default function NewActivityForm({ customerId, onSuccess }: Props) {
  const action = createActivity.bind(null, customerId)
  const [state, formAction, pending] = useActionState(action, undefined)
  const [submitted, setSubmitted] = useState(false)

  const errors = (state as { errors?: { type?: string[] } } | undefined)?.errors
  const message = (state as { message?: string } | undefined)?.message
  const success = (state as { success?: boolean } | undefined)?.success

  if (success && !submitted) {
    setSubmitted(true)
    onSuccess?.()
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {message && <p className="text-xs text-red-600">{message}</p>}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Tipo *</label>
          <select
            name="type"
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Selecionar tipo</option>
            <option value="note">Nota</option>
            <option value="email">E-mail</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone_call">Ligação</option>
            <option value="meeting">Reunião</option>
          </select>
          {errors?.type && <p className="mt-0.5 text-xs text-red-600">{errors.type[0]}</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Status</label>
          <select
            name="status"
            defaultValue="open"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="open">Aberto</option>
            <option value="scheduled">Agendado</option>
            <option value="done">Concluído</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Assunto</label>
        <input
          name="subject"
          placeholder="Assunto da atividade"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Descrição</label>
        <textarea
          name="description"
          rows={3}
          placeholder="Descreva a atividade..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Agendado para</label>
          <input
            type="datetime-local"
            name="scheduledAt"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Ocorrido em</label>
          <input
            type="datetime-local"
            name="occurredAt"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? 'Salvando...' : 'Salvar Atividade'}
        </button>
      </div>
    </form>
  )
}
