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
  backlog: 'bg-slate-50 text-slate-500 ring-slate-400/20',
  todo: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  in_progress: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  review: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  done: 'bg-green-50 text-green-700 ring-green-600/20',
  cancelled: 'bg-red-50 text-red-600 ring-red-500/20',
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
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {errors?.title && <p className="mt-0.5 text-xs text-red-600">{errors.title[0]}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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
        <h3 className="text-sm font-semibold text-slate-700">
          Subtarefas
          {subtasks.length > 0 && (
            <span className="ml-2 text-xs font-normal text-slate-400">{done}/{subtasks.length}</span>
          )}
        </h3>
      </div>

      {subtasks.length > 0 && (
        <div className="mb-3 h-1.5 w-full rounded-full bg-slate-100">
          <div
            className="h-1.5 rounded-full bg-indigo-500 transition-all"
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
                className="flex-1 text-sm text-slate-800 hover:text-indigo-600 line-clamp-1"
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
        <p className="text-xs text-slate-400">Nenhuma subtarefa.</p>
      )}

      <AddSubtaskForm customerId={customerId} taskId={taskId} />
    </div>
  )
}
