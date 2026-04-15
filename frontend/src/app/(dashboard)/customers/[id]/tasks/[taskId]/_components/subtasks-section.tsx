'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createSubtask } from '@/app/actions/tasks'
import { Task } from '@/lib/definitions'

const STATUS_LABEL: Record<string, string> = {
  backlog: 'Backlog', todo: 'A fazer', in_progress: 'Em andamento',
  review: 'Revisão', done: 'Concluído', cancelled: 'Cancelado',
}
const STATUS_CLASS: Record<string, string> = {
  backlog: 'bg-canvas text-md ring-border',
  todo: 'bg-blue-500/10 text-blue-400 ring-blue-600/20',
  in_progress: 'bg-amber-500/10 text-amber-400 ring-amber-600/20',
  review: 'bg-indigo-500/10 text-indigo-400 ring-indigo-600/20',
  done: 'bg-green-500/10 text-green-400 ring-green-600/20',
  cancelled: 'bg-red-500/10 text-red-400 ring-red-500/20',
}

type Props = { customerId: string; taskId: string; subtasks: Task[] }

function AddSubtaskForm({ customerId, taskId }: { customerId: string; taskId: string }) {
  const action = createSubtask.bind(null, customerId, taskId)
  const [state, formAction, pending] = useActionState(action, undefined)
  const errors = (state as { errors?: { title?: string[] } } | undefined)?.errors

  return (
    <form action={formAction} className="mt-3 flex gap-2">
      <div className="flex-1">
        <input
          name="title"
          placeholder="Título da subtarefa"
          className="w-full rounded-lg border border-border-strong bg-elevated px-3 py-1.5 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
        />
        {errors?.title && <p className="mt-0.5 text-xs text-red-400">{errors.title[0]}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg btn-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? '...' : 'Adicionar'}
      </button>
    </form>
  )
}

export default function SubtasksSection({ customerId, taskId, subtasks }: Props) {
  const done = subtasks.filter(s => s.status === 'done' || s.status === 'cancelled').length

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-hi">
          Subtarefas
          {subtasks.length > 0 && (
            <span className="ml-2 text-xs font-normal text-lo">{done}/{subtasks.length}</span>
          )}
        </h3>
      </div>

      {subtasks.length > 0 && (
        <div className="mb-3 h-1.5 w-full rounded-full bg-elevated">
          <div
            className="h-1.5 rounded-full bg-indigo-500/100 transition-all"
            style={{ width: `${Math.round((done / subtasks.length) * 100)}%` }}
          />
        </div>
      )}

      {subtasks.length > 0 ? (
        <ul className="flex flex-col divide-y divide-slate-100">
          {subtasks.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 gap-3">
              <Link
                href={`/customers/${customerId}/tasks/${s.id}`}
                className="flex-1 text-sm text-hi hover:text-accent line-clamp-1"
              >
                {s.title}
              </Link>
              <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[s.status] ?? ''}`}>
                {STATUS_LABEL[s.status] ?? s.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-lo">Nenhuma subtarefa.</p>
      )}

      <AddSubtaskForm customerId={customerId} taskId={taskId} />
    </div>
  )
}
