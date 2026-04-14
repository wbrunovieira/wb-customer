'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { moveTaskStatus } from '@/app/actions/tasks'
import { Task, TaskStatus } from '@/lib/definitions'
import MoveStatusButton from './move-status-button'
import DeleteTaskButton from './delete-task-button'

const KANBAN_COLUMNS: { status: TaskStatus; label: string; headerColor: string; dropColor: string }[] = [
  { status: 'backlog', label: 'Backlog', headerColor: 'bg-slate-100 text-slate-700', dropColor: 'bg-slate-50' },
  { status: 'todo', label: 'A Fazer', headerColor: 'bg-blue-100 text-blue-700', dropColor: 'bg-blue-50/30' },
  { status: 'in_progress', label: 'Em Andamento', headerColor: 'bg-amber-100 text-amber-700', dropColor: 'bg-amber-50/30' },
  { status: 'review', label: 'Revisão', headerColor: 'bg-indigo-100 text-indigo-700', dropColor: 'bg-indigo-50/30' },
  { status: 'done', label: 'Concluído', headerColor: 'bg-green-100 text-green-700', dropColor: 'bg-green-50/30' },
]

const STATUS_CLASS: Record<TaskStatus, string> = {
  idea_could: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  idea_should: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  backlog: 'bg-slate-50 text-slate-500 ring-slate-400/20',
  todo: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  in_progress: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  review: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  done: 'bg-green-50 text-green-700 ring-green-600/20',
  cancelled: 'bg-red-50 text-red-600 ring-red-500/20',
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  idea_could: 'Ideia (could)',
  idea_should: 'Ideia (should)',
  backlog: 'Backlog',
  todo: 'A fazer',
  in_progress: 'Em andamento',
  review: 'Revisão',
  done: 'Concluído',
  cancelled: 'Cancelado',
}

function IceScore({ value }: { value: number | null }) {
  if (value === null) return null
  return (
    <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
      ICE {value.toFixed(1)}
    </span>
  )
}

function TaskCardContent({ task, customerId, dragging = false }: { task: Task; customerId: string; dragging?: boolean }) {
  return (
    <div className={`rounded-lg border bg-white p-3 shadow-sm transition-shadow ${dragging ? 'border-indigo-300 shadow-lg rotate-1 opacity-90' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/customers/${customerId}/tasks/${task.id}`}
          className="flex-1 text-sm font-medium text-slate-900 hover:text-indigo-600 line-clamp-2"
          onClick={(e) => dragging && e.preventDefault()}
        >
          {task.title}
        </Link>
        <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[task.status]}`}>
          {STATUS_LABEL[task.status]}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <IceScore value={task.iceScore} />
        {task.progress > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-16 rounded-full bg-slate-100">
              <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${task.progress}%` }} />
            </div>
            <span className="text-xs text-slate-400">{task.progress}%</span>
          </div>
        )}
        {task.endAt && (
          <span className="text-xs text-slate-400">
            {new Date(task.endAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
          </span>
        )}
      </div>

      {!dragging && (
        <div className="mt-2 flex items-center justify-between">
          <MoveStatusButton customerId={customerId} taskId={task.id} currentStatus={task.status} />
          <div className="flex items-center gap-2">
            <Link href={`/customers/${customerId}/tasks/${task.id}`} className="text-xs text-indigo-600 hover:underline">
              Detalhes
            </Link>
            <DeleteTaskButton customerId={customerId} taskId={task.id} />
          </div>
        </div>
      )}
    </div>
  )
}

function SortableTaskCard({ task, customerId }: { task: Task; customerId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCardContent task={task} customerId={customerId} />
    </div>
  )
}

function KanbanColumn({
  column,
  tasks,
  customerId,
  isOver,
}: {
  column: (typeof KANBAN_COLUMNS)[number]
  tasks: Task[]
  customerId: string
  isOver: boolean
}) {
  const taskIds = tasks.map((t) => t.id)

  return (
    <div className={`flex w-72 shrink-0 flex-col gap-2 rounded-xl transition-colors ${isOver ? column.dropColor : ''}`}>
      <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${column.headerColor.split(' ')[0]}`}>
        <span className={`text-xs font-semibold ${column.headerColor.split(' ')[1]}`}>{column.label}</span>
        <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-xs font-medium text-slate-600">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-[60px]">
          {tasks.map((t) => (
            <SortableTaskCard key={t.id} task={t} customerId={customerId} />
          ))}
        </div>
      </SortableContext>

      <Link
        href={`/customers/${customerId}/tasks?newTask=1&view=kanban`}
        className="flex items-center gap-1 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400 hover:border-slate-300 hover:text-slate-600"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Adicionar
      </Link>
    </div>
  )
}

type Props = {
  initialTasks: Task[]
  customerId: string
}

export default function KanbanBoard({ initialTasks, customerId }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function getColumnFromId(id: string): TaskStatus | null {
    // id can be a taskId or a column status string
    const col = KANBAN_COLUMNS.find((c) => c.status === id)
    if (col) return col.status
    const task = tasks.find((t) => t.id === id)
    return task?.status ?? null
  }

  function onDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task ?? null)
  }

  function onDragOver(event: DragOverEvent) {
    setOverId(event.over?.id as string ?? null)
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    setOverId(null)

    const { active, over } = event
    if (!over) return

    const fromStatus = getColumnFromId(active.id as string)
    const toStatus = getColumnFromId(over.id as string)

    if (!fromStatus || !toStatus || fromStatus === toStatus) return

    const taskId = active.id as string

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: toStatus } : t)),
    )

    startTransition(() => {
      moveTaskStatus(customerId, taskId, toStatus)
    })
  }

  const overStatus = overId ? getColumnFromId(overId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status)
          return (
            <KanbanColumn
              key={col.status}
              column={col}
              tasks={colTasks}
              customerId={customerId}
              isOver={overStatus === col.status}
            />
          )
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCardContent task={activeTask} customerId={customerId} dragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
