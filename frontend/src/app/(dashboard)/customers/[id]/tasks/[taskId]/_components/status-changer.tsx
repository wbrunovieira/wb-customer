'use client'

import { useTransition } from 'react'
import { moveTaskStatus } from '@/app/actions/tasks'
import { TaskStatus } from '@/lib/definitions'

const ALL_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'idea_could', label: 'Ideia (could)' },
  { value: 'idea_should', label: 'Ideia (should)' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'A fazer' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'review', label: 'Revisão' },
  { value: 'done', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
]

type Props = {
  customerId: string
  taskId: string
  currentStatus: TaskStatus
}

export default function StatusChanger({ customerId, taskId, currentStatus }: Props) {
  const [pending, startTransition] = useTransition()

  return (
    <select
      value={currentStatus}
      disabled={pending}
      onChange={(e) =>
        startTransition(() => moveTaskStatus(customerId, taskId, e.target.value))
      }
      className="rounded-lg border border-border-strong bg-elevated px-3 py-1.5 text-sm text-hi focus:border-brand/60 focus:outline-none disabled:opacity-50"
    >
      {ALL_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  )
}
