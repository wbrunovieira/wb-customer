'use client'

import { useActionState } from 'react'
import { updateTask } from '@/app/actions/tasks'
import { Task, Sprint, TaskStatus } from '@/lib/definitions'

type Props = {
  customerId: string
  task: Task
  sprints: Sprint[]
}

export default function UpdateTaskForm({ customerId, task, sprints }: Props) {
  const action = updateTask.bind(null, customerId, task.id)
  const [state, formAction, pending] = useActionState(action, undefined)
  const message = (state as { message?: string } | undefined)?.message
  const success = (state as { success?: boolean } | undefined)?.success

  function toDateInputValue(iso: string | null): string {
    if (!iso) return ''
    return iso.slice(0, 16) // YYYY-MM-DDTHH:MM
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {message && <p className="text-xs text-red-400">{message}</p>}
      {success && <p className="text-xs text-green-400">Salvo com sucesso.</p>}

      <div>
        <label className="text-xs text-md">Título</label>
        <input
          name="title"
          defaultValue={task.title}
          required
          className="mt-0.5 w-full rounded-lg border border-border-strong bg-elevated px-3 py-2 text-sm text-hi focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
        />
      </div>

      <div>
        <label className="text-xs text-md">Descrição</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={task.description ?? ''}
          className="mt-0.5 w-full rounded-lg border border-border-strong bg-elevated px-3 py-2 text-sm text-hi focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
        />
      </div>

      {sprints.length > 0 && (
        <div>
          <label className="text-xs text-md">Sprint</label>
          <select
            name="sprintId"
            defaultValue={task.sprintId ?? ''}
            className="mt-0.5 w-full rounded-lg border border-border-strong bg-elevated px-3 py-2 text-sm text-hi focus:border-brand/60 focus:outline-none"
          >
            <option value="">Sem sprint</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-md">Início</label>
          <input
            name="startAt"
            type="datetime-local"
            defaultValue={toDateInputValue(task.startAt)}
            className="mt-0.5 w-full rounded-lg border border-border-strong bg-elevated px-3 py-2 text-sm text-hi focus:border-brand/60 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-md">Prazo</label>
          <input
            name="endAt"
            type="datetime-local"
            defaultValue={toDateInputValue(task.endAt)}
            className="mt-0.5 w-full rounded-lg border border-border-strong bg-elevated px-3 py-2 text-sm text-hi focus:border-brand/60 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-md">Impacto (1-10)</label>
          <input
            name="impact"
            type="number"
            min="1"
            max="10"
            defaultValue={task.impact ?? ''}
            placeholder="—"
            className="mt-0.5 w-full rounded-lg border border-border-strong bg-elevated px-3 py-2 text-sm text-hi focus:border-brand/60 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-md">Confiança (1-10)</label>
          <input
            name="confidence"
            type="number"
            min="1"
            max="10"
            defaultValue={task.confidence ?? ''}
            placeholder="—"
            className="mt-0.5 w-full rounded-lg border border-border-strong bg-elevated px-3 py-2 text-sm text-hi focus:border-brand/60 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-md">Esforço (1-10)</label>
          <input
            name="effort"
            type="number"
            min="1"
            max="10"
            defaultValue={task.effort ?? ''}
            placeholder="—"
            className="mt-0.5 w-full rounded-lg border border-border-strong bg-elevated px-3 py-2 text-sm text-hi focus:border-brand/60 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg btn-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  )
}
