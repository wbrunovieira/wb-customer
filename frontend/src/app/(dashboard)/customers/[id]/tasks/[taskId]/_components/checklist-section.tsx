'use client'

import { useTransition, useActionState } from 'react'
import { addChecklistItem, toggleChecklistItem, deleteChecklistItem } from '@/app/actions/tasks'
import { ChecklistItem } from '@/lib/definitions'

type Props = {
  customerId: string
  taskId: string
  items: ChecklistItem[]
}

function AddItemForm({ customerId, taskId }: { customerId: string; taskId: string }) {
  const action = addChecklistItem.bind(null, customerId, taskId)
  const [state, formAction, pending] = useActionState(action, undefined)
  const errors = (state as { errors?: { text?: string[] } } | undefined)?.errors

  return (
    <form action={formAction} className="flex gap-2 mt-3">
      <div className="flex-1">
        <input
          name="text"
          placeholder="Adicionar item..."
          className="w-full rounded-lg border border-border-strong bg-elevated px-3 py-1.5 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
        />
        {errors?.text && <p className="mt-0.5 text-xs text-red-400">{errors.text[0]}</p>}
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

function ChecklistItemRow({
  item,
  customerId,
  taskId,
}: {
  item: ChecklistItem
  customerId: string
  taskId: string
}) {
  const [pending, startTransition] = useTransition()

  return (
    <li className="flex items-center gap-3 py-1.5">
      <button
        disabled={pending}
        onClick={() => startTransition(() => toggleChecklistItem(customerId, taskId, item.id))}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors disabled:opacity-40 ${
          item.isDone
            ? 'border-indigo-500 bg-indigo-500/100 text-white'
            : 'border-border bg-surface hover:border-indigo-400'
        }`}
        aria-label={item.isDone ? 'Desmarcar' : 'Marcar como concluído'}
      >
        {item.isDone && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <span className={`flex-1 text-sm ${item.isDone ? 'text-lo line-through' : 'text-hi'}`}>
        {item.text}
      </span>
      <button
        disabled={pending}
        onClick={() => startTransition(() => deleteChecklistItem(customerId, taskId, item.id))}
        className="text-xs text-lo hover:text-red-400 disabled:opacity-40"
        aria-label="Remover item"
      >
        ×
      </button>
    </li>
  )
}

export default function ChecklistSection({ customerId, taskId, items }: Props) {
  const done = items.filter((i) => i.isDone).length
  const total = items.length

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-hi">
          Checklist
          {total > 0 && (
            <span className="ml-2 text-xs font-normal text-lo">
              {done}/{total}
            </span>
          )}
        </h3>
      </div>

      {total > 0 && (
        <div className="mb-3">
          <div className="h-1.5 w-full rounded-full bg-elevated">
            <div
              className="h-1.5 rounded-full bg-indigo-500/100 transition-all"
              style={{ width: `${Math.round((done / total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <ul className="flex flex-col divide-y divide-slate-100">
          {items.map((item) => (
            <ChecklistItemRow key={item.id} item={item} customerId={customerId} taskId={taskId} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-lo">Nenhum item no checklist.</p>
      )}

      <AddItemForm customerId={customerId} taskId={taskId} />
    </div>
  )
}
