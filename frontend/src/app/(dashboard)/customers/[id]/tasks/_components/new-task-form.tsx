'use client'

import { useActionState, useState } from 'react'
import { createTask } from '@/app/actions/tasks'
import { Sprint } from '@/lib/definitions'

type Props = {
  customerId: string
  sprints: Sprint[]
  defaultStatus?: string
  onSuccess?: () => void
}

export default function NewTaskForm({ customerId, sprints, defaultStatus = 'backlog', onSuccess }: Props) {
  const action = createTask.bind(null, customerId)
  const [state, formAction, pending] = useActionState(action, undefined)
  const [submitted, setSubmitted] = useState(false)

  const errors = (state as { errors?: { title?: string[] } } | undefined)?.errors
  const message = (state as { message?: string } | undefined)?.message
  const success = (state as { success?: boolean } | undefined)?.success

  if (success && !submitted) {
    setSubmitted(true)
    onSuccess?.()
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {message && <p className="text-xs text-red-600">{message}</p>}

      <div>
        <input
          name="title"
          placeholder="Título da tarefa"
          required
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {errors?.title && <p className="mt-0.5 text-xs text-red-600">{errors.title[0]}</p>}
      </div>

      <textarea
        name="description"
        rows={2}
        placeholder="Descrição (opcional)"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500">Status</label>
          <select
            name="status"
            defaultValue={defaultStatus}
            className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
          >
            <option value="idea_could">Ideia (could)</option>
            <option value="idea_should">Ideia (should)</option>
            <option value="backlog">Backlog</option>
            <option value="todo">A fazer</option>
            <option value="in_progress">Em andamento</option>
            <option value="review">Revisão</option>
            <option value="done">Concluído</option>
          </select>
        </div>

        {sprints.length > 0 && (
          <div>
            <label className="text-xs text-slate-500">Sprint</label>
            <select
              name="sprintId"
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Sem sprint</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-slate-500">Início (opcional)</label>
          <input
            name="startAt"
            type="date"
            className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Prazo (opcional)</label>
          <input
            name="endAt"
            type="date"
            className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Horas estimadas</label>
          <input
            name="estimatedHours"
            type="number"
            min="0"
            step="0.5"
            placeholder="—"
            className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-slate-500">Impacto (1-10)</label>
          <input
            name="impact"
            type="number"
            min="1"
            max="10"
            placeholder="—"
            className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Confiança (1-10)</label>
          <input
            name="confidence"
            type="number"
            min="1"
            max="10"
            placeholder="—"
            className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Esforço (1-10)</label>
          <input
            name="effort"
            type="number"
            min="1"
            max="10"
            placeholder="—"
            className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? 'Criando...' : 'Criar tarefa'}
      </button>
    </form>
  )
}
