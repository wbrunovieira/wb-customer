'use client'

import { useTransition } from 'react'
import { moveTaskStatus } from '@/app/actions/tasks'
import { TaskStatus } from '@/lib/definitions'

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  backlog: 'todo',
  todo: 'in_progress',
  in_progress: 'review',
  review: 'done',
}

const PREV_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  todo: 'backlog',
  in_progress: 'todo',
  review: 'in_progress',
  done: 'review',
}

type Props = {
  customerId: string
  taskId: string
  currentStatus: TaskStatus
}

export default function MoveStatusButton({ customerId, taskId, currentStatus }: Props) {
  const [pending, startTransition] = useTransition()
  const next = NEXT_STATUS[currentStatus]
  const prev = PREV_STATUS[currentStatus]

  if (!next && !prev) return null

  return (
    <div className="flex gap-1">
      {prev && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => moveTaskStatus(customerId, taskId, prev))}
          className="rounded px-2 py-0.5 text-xs text-md hover:bg-elevated disabled:opacity-40"
          title={`Mover para ${prev}`}
        >
          ←
        </button>
      )}
      {next && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => moveTaskStatus(customerId, taskId, next))}
          className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs text-accent hover:bg-indigo-100 disabled:opacity-40"
          title={`Mover para ${next}`}
        >
          → {STATUS_LABEL[next]}
        </button>
      )}
    </div>
  )
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  idea_could: 'Ideia',
  idea_should: 'Ideia',
  backlog: 'Backlog',
  todo: 'A fazer',
  in_progress: 'Em andamento',
  review: 'Revisão',
  done: 'Concluído',
  cancelled: 'Cancelado',
}
