import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { Customer, Task, TaskStatus, Sprint, TaskTemplate, PaginatedResponse } from '@/lib/definitions'
import MoveStatusButton from './_components/move-status-button'
import DeleteTaskButton from './_components/delete-task-button'
import NewTaskForm from './_components/new-task-form'
import KanbanBoard from './_components/kanban-board'
import CalendarView from './_components/calendar-view'
import GanttView from './_components/gantt-view'
import TemplatesSection from './_components/templates-section'

export const metadata = { title: 'Tarefas — WB Customer' }

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

function IceScore({ value }: { value: number | null }) {
  if (value === null) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
      ICE {value.toFixed(1)}
    </span>
  )
}

function TaskCard({ task, customerId, compact = false }: { task: Task; customerId: string; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/customers/${customerId}/tasks/${task.id}`}
          className="flex-1 text-sm font-medium text-slate-900 hover:text-indigo-600 line-clamp-2"
        >
          {task.title}
        </Link>
        <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[task.status]}`}>
          {STATUS_LABEL[task.status]}
        </span>
      </div>

      {task.description && !compact && (
        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{task.description}</p>
      )}

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

      <div className="mt-2 flex items-center justify-between">
        <MoveStatusButton customerId={customerId} taskId={task.id} currentStatus={task.status} />
        <div className="flex items-center gap-2">
          <Link
            href={`/customers/${customerId}/tasks/${task.id}`}
            className="text-xs text-indigo-600 hover:underline"
          >
            Detalhes
          </Link>
          <DeleteTaskButton customerId={customerId} taskId={task.id} />
        </div>
      </div>
    </div>
  )
}

export default async function CustomerTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ view?: string; status?: string; sprintId?: string; newTask?: string; newSprint?: string }>
}) {
  const { id } = await params
  const { view, status, sprintId, newTask, newSprint } = await searchParams

  let customer: Customer
  let tasks: Task[] = []
  let sprints: Sprint[] = []
  let templates: TaskTemplate[] = []

  try {
    customer = await apiServer.get<Customer>(`/api/v1/customers/${id}`)
  } catch {
    notFound()
  }

  try {
    const query = new URLSearchParams()
    if (status) query.set('status', status)
    if (sprintId) query.set('sprintId', sprintId)
    query.set('limit', '200')

    const [tasksRes, sprintsRes, templatesRes] = await Promise.all([
      apiServer.get<PaginatedResponse<Task>>(`/api/v1/customers/${id}/tasks?${query}`),
      apiServer.get<{ sprints: Sprint[] }>(`/api/v1/customers/${id}/sprints`),
      apiServer.get<{ templates: TaskTemplate[] }>('/api/v1/task-templates').catch(() => ({ templates: [] })),
    ])
    tasks = tasksRes.items
    sprints = sprintsRes.sprints
    templates = templatesRes.templates
  } catch {
    // show empty
  }

  const isKanban = view === 'kanban'
  const isCalendar = view === 'calendar'
  const isGantt = view === 'gantt'

  const subTabs = [
    { href: `/customers/${id}/documents`, label: 'Documentos' },
    { href: `/customers/${id}/meetings`, label: 'Reuniões' },
    { href: `/customers/${id}/tasks`, label: 'Tarefas', active: true },
    { href: `/customers/${id}/portal-users`, label: 'Portal' },
  ]

  // Separate ideas from normal tasks
  const ideas = tasks.filter(t => t.status === 'idea_could' || t.status === 'idea_should')
  const boardTasks = tasks.filter(t => t.status !== 'idea_could' && t.status !== 'idea_should' && t.status !== 'cancelled')

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/customers" className="hover:text-slate-900">Clientes</Link>
            <span>/</span>
            <Link href={`/customers/${id}`} className="hover:text-slate-900">{customer!.name}</Link>
            <span>/</span>
            <span className="text-slate-900">Tarefas</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Tarefas — {customer!.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{tasks.length} tarefa(s)</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
            {[
              { key: undefined, label: 'Lista' },
              { key: 'kanban',   label: 'Kanban' },
              { key: 'calendar', label: 'Calendário' },
              { key: 'gantt',    label: 'Gantt' },
            ].map(({ key, label }) => {
              const active = view === key || (!view && !key)
              const href = key
                ? `/customers/${id}/tasks?view=${key}${status ? `&status=${status}` : ''}`
                : `/customers/${id}/tasks${status ? `?status=${status}` : ''}`
              return (
                <Link
                  key={label}
                  href={href}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {label}
                </Link>
              )
            })}
          </div>

          <Link
            href={`/customers/${id}/tasks?newTask=1${view ? `&view=${view}` : ''}`}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova Tarefa
          </Link>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {subTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab.active
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* New task inline form */}
      {newTask && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Nova Tarefa</h3>
          <NewTaskForm customerId={id} sprints={sprints} />
          <Link
            href={`/customers/${id}/tasks${view ? `?view=${view}` : ''}`}
            className="mt-3 inline-block text-xs text-slate-500 hover:text-slate-700"
          >
            Cancelar
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(['backlog', 'todo', 'in_progress', 'review', 'done'] as TaskStatus[]).map((s) => (
            <Link
              key={s}
              href={`/customers/${id}/tasks?${view ? `view=${view}&` : ''}${status === s ? '' : `status=${s}`}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                status === s ? STATUS_CLASS[s] : 'bg-white text-slate-500 ring-slate-200 hover:ring-slate-300'
              }`}
            >
              {STATUS_LABEL[s]}
            </Link>
          ))}
        </div>
        {sprints.length > 0 && (
          <select
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
            defaultValue={sprintId || ''}
            onChange={(e) => {
              const url = new URL(window.location.href)
              if (e.target.value) url.searchParams.set('sprintId', e.target.value)
              else url.searchParams.delete('sprintId')
              window.location.href = url.toString()
            }}
          >
            <option value="">Todos os sprints</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Ideas section */}
      {ideas.length > 0 && !status && (
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-purple-800">
            💡 Ideias ({ideas.length})
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ideas.map((t) => (
              <TaskCard key={t.id} task={t} customerId={id} compact />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {tasks.length === 0 && !ideas.length ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white gap-2">
          <p className="text-sm text-slate-400">Nenhuma tarefa encontrada.</p>
          <Link
            href={`/customers/${id}/tasks?newTask=1`}
            className="text-xs text-indigo-600 hover:underline"
          >
            Criar primeira tarefa
          </Link>
        </div>
      ) : isCalendar ? (
        <CalendarView tasks={tasks} customerId={id} />
      ) : isGantt ? (
        <GanttView tasks={tasks} customerId={id} />
      ) : isKanban ? (
        /* Kanban view with drag and drop */
        <KanbanBoard initialTasks={boardTasks} customerId={id} />
      ) : (
        /* List view */
        <div className="flex flex-col gap-3">
          {boardTasks.map((t) => (
            <TaskCard key={t.id} task={t} customerId={id} />
          ))}
        </div>
      )}

      {/* Templates section */}
      <TemplatesSection customerId={id} templates={templates} tasks={tasks} />

      {/* Sprints section */}
      {sprints.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Sprints</h3>
          <div className="flex flex-col gap-2">
            {sprints.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-slate-900">{s.name}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    {new Date(s.startAt).toLocaleDateString('pt-BR')} → {new Date(s.endAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <Link
                  href={`/customers/${id}/tasks?sprintId=${s.id}`}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Ver tarefas
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
