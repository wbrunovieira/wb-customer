'use client'

import { useState, useTransition, useRef } from 'react'
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
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { moveTaskStatus } from '@/app/actions/tasks'
import { Task, TaskStatus } from '@/lib/definitions'
import MoveStatusButton from './move-status-button'
import DeleteTaskButton from './delete-task-button'

const KANBAN_COLUMNS: {
  status: TaskStatus
  label: string
  headerBg: string
  headerText: string
  overBg: string
}[] = [
  { status: 'backlog',     label: 'Backlog',       headerBg: 'bg-slate-100',  headerText: 'text-slate-700',  overBg: 'bg-slate-100/60'  },
  { status: 'todo',        label: 'A Fazer',        headerBg: 'bg-blue-100',   headerText: 'text-blue-700',   overBg: 'bg-blue-100/40'   },
  { status: 'in_progress', label: 'Em Andamento',   headerBg: 'bg-amber-100',  headerText: 'text-amber-700',  overBg: 'bg-amber-100/40'  },
  { status: 'review',      label: 'Revisão',        headerBg: 'bg-indigo-100', headerText: 'text-indigo-700', overBg: 'bg-indigo-100/40' },
  { status: 'done',        label: 'Concluído',      headerBg: 'bg-green-100',  headerText: 'text-green-700',  overBg: 'bg-green-100/40'  },
]

const STATUS_CLASS: Record<TaskStatus, string> = {
  idea_could:  'bg-purple-50 text-purple-700 ring-purple-600/20',
  idea_should: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  backlog:     'bg-slate-50  text-slate-500  ring-slate-400/20',
  todo:        'bg-blue-50   text-blue-700   ring-blue-600/20',
  in_progress: 'bg-amber-50  text-amber-700  ring-amber-600/20',
  review:      'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  done:        'bg-green-50  text-green-700  ring-green-600/20',
  cancelled:   'bg-red-50    text-red-600    ring-red-500/20',
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  idea_could:  'Ideia (could)',
  idea_should: 'Ideia (should)',
  backlog:     'Backlog',
  todo:        'A fazer',
  in_progress: 'Em andamento',
  review:      'Revisão',
  done:        'Concluído',
  cancelled:   'Cancelado',
}

function GripHandle(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className="flex shrink-0 cursor-grab items-center px-1 text-slate-300 hover:text-slate-400 active:cursor-grabbing"
      title="Arrastar"
    >
      <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor">
        <circle cx="3" cy="4"  r="1.5" />
        <circle cx="9" cy="4"  r="1.5" />
        <circle cx="3" cy="10" r="1.5" />
        <circle cx="9" cy="10" r="1.5" />
        <circle cx="3" cy="16" r="1.5" />
        <circle cx="9" cy="16" r="1.5" />
      </svg>
    </div>
  )
}

function TaskCardContent({
  task,
  customerId,
  dragging = false,
  dragHandleListeners,
  dragHandleAttributes,
}: {
  task: Task
  customerId: string
  dragging?: boolean
  dragHandleListeners?: React.HTMLAttributes<HTMLElement>
  dragHandleAttributes?: React.HTMLAttributes<HTMLElement>
}) {
  return (
    <div
      className={`flex items-stretch rounded-lg border bg-white shadow-sm transition-shadow ${
        dragging
          ? 'border-indigo-300 shadow-xl rotate-1 opacity-95'
          : 'border-slate-200 hover:border-slate-300 hover:shadow'
      }`}
    >
      {/* Drag handle strip */}
      <GripHandle {...(dragHandleListeners ?? {})} {...(dragHandleAttributes ?? {})} />

      {/* Card body */}
      <div className="flex-1 py-3 pr-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/customers/${customerId}/tasks/${task.id}`}
            className="flex-1 text-sm font-medium text-slate-900 hover:text-indigo-600 line-clamp-2"
          >
            {task.title}
          </Link>
          <span
            className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[task.status]}`}
          >
            {STATUS_LABEL[task.status]}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {task.iceScore !== null && (
            <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
              ICE {task.iceScore.toFixed(1)}
            </span>
          )}
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
    </div>
  )
}

function SortableCard({ task, customerId }: { task: Task; customerId: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      <TaskCardContent
        task={task}
        customerId={customerId}
        dragHandleListeners={listeners as React.HTMLAttributes<HTMLElement>}
        dragHandleAttributes={attributes as React.HTMLAttributes<HTMLElement>}
      />
    </div>
  )
}

function DroppableColumn({
  column,
  tasks,
  customerId,
}: {
  column: (typeof KANBAN_COLUMNS)[number]
  tasks: Task[]
  customerId: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status })

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      {/* Header */}
      <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${column.headerBg}`}>
        <span className={`text-xs font-semibold ${column.headerText}`}>{column.label}</span>
        <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-xs font-medium text-slate-600">
          {tasks.length}
        </span>
      </div>

      {/* Cards area — this is the droppable target */}
      <div
        ref={setNodeRef}
        className={`flex min-h-[80px] flex-col gap-2 rounded-lg p-1 transition-colors ${
          isOver ? column.overBg + ' ring-2 ring-inset ring-indigo-300/50' : ''
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <SortableCard key={t.id} task={t} customerId={customerId} />
          ))}
        </SortableContext>
      </div>

      {/* Add button */}
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

// ─── Main board ───────────────────────────────────────────────

type Props = { initialTasks: Task[]; customerId: string }

export default function KanbanBoard({ initialTasks, customerId }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [, startTransition] = useTransition()

  // Remember the status before drag so we can detect actual change
  const dragOriginStatus = useRef<TaskStatus | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  function columnStatuses(): TaskStatus[] {
    return KANBAN_COLUMNS.map((c) => c.status)
  }

  /** Given an id (column status OR task id), return the TaskStatus column */
  function resolveColumn(id: string): TaskStatus | null {
    if ((columnStatuses() as string[]).includes(id)) return id as TaskStatus
    const task = tasks.find((t) => t.id === id)
    return task?.status ?? null
  }

  function onDragStart({ active }: DragStartEvent) {
    const task = tasks.find((t) => t.id === active.id)
    if (!task) return
    setActiveTask(task)
    dragOriginStatus.current = task.status
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return

    const fromCol = resolveColumn(active.id as string)
    const toCol   = resolveColumn(over.id as string)

    if (!fromCol || !toCol || fromCol === toCol) return

    // Move the task into the target column immediately (optimistic visual)
    setTasks((prev) =>
      prev.map((t) => (t.id === active.id ? { ...t, status: toCol } : t)),
    )
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null)

    const taskId = active.id as string
    const finalTask = tasks.find((t) => t.id === taskId)
    const origin = dragOriginStatus.current
    dragOriginStatus.current = null

    if (!over || !finalTask || !origin) {
      // Dropped outside — revert
      if (origin) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: origin } : t)),
        )
      }
      return
    }

    if (finalTask.status === origin) return // no real change

    // Persist
    startTransition(() => {
      moveTaskStatus(customerId, taskId, finalTask.status)
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => (
          <DroppableColumn
            key={col.status}
            column={col}
            tasks={tasks.filter((t) => t.status === col.status)}
            customerId={customerId}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div style={{ width: 288 }}>
            <TaskCardContent task={activeTask} customerId={customerId} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
