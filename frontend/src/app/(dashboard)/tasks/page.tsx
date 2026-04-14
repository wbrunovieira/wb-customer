import Link from 'next/link'
import { apiServer } from '@/lib/api-server'
import { Task, TaskStatus, CustomerListItem, PaginatedResponse } from '@/lib/definitions'
import CreateTaskModal from './_components/create-task-modal'

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

const FILTER_STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done']

type SearchParams = {
  status?: string
  page?: string
  groupBy?: string
  customerId?: string
}

export default async function AllTasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { status, page, groupBy, customerId } = await searchParams
  const currentPage = page ? Number(page) : 1
  const isGrouped = groupBy === 'customer'

  const query = new URLSearchParams()
  if (status) query.set('status', status)
  if (customerId) query.set('customerId', customerId)
  query.set('page', String(currentPage))
  query.set('limit', '100')

  let tasks: Task[] = []
  let total = 0
  let customers: CustomerListItem[] = []

  try {
    const [tasksRes, customersRes] = await Promise.all([
      apiServer.get<PaginatedResponse<Task>>(`/api/v1/tasks?${query}`),
      apiServer.get<PaginatedResponse<CustomerListItem>>('/api/v1/customers?limit=200&status=active'),
    ])
    tasks = tasksRes.items
    total = tasksRes.total
    customers = customersRes.items
  } catch {
    // show empty
  }

  function buildHref(overrides: { status?: string; page?: number; groupBy?: string; customerId?: string }) {
    const p = new URLSearchParams()
    const s = 'status' in overrides ? overrides.status : status
    const c = 'customerId' in overrides ? overrides.customerId : customerId
    const g = 'groupBy' in overrides ? overrides.groupBy : groupBy
    const pg = overrides.page ?? 1
    if (s) p.set('status', s)
    if (c) p.set('customerId', c)
    if (g) p.set('groupBy', g)
    if (pg > 1) p.set('page', String(pg))
    const str = p.toString()
    return `/tasks${str ? `?${str}` : ''}`
  }

  const totalPages = Math.ceil(total / 100)

  // Group by customer
  const grouped = new Map<string, { name: string; tasks: Task[] }>()
  if (isGrouped) {
    for (const t of tasks) {
      const cid = t.customerId
      if (!grouped.has(cid)) grouped.set(cid, { name: t.customerName ?? cid, tasks: [] })
      grouped.get(cid)!.tasks.push(t)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tarefas</h1>
          <p className="mt-1 text-sm text-slate-500">{total} tarefa(s) no total</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <CreateTaskModal customers={customers} />

          {/* Group toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden shrink-0">
          <Link
            href={buildHref({ groupBy: undefined, page: 1 })}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${!isGrouped ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Lista
          </Link>
          <Link
            href={buildHref({ groupBy: 'customer', page: 1 })}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${isGrouped ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Por cliente
          </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={buildHref({ status: undefined, page: 1 })}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
              !status ? 'bg-slate-800 text-white ring-slate-700' : 'bg-white text-slate-500 ring-slate-200 hover:ring-slate-300'
            }`}
          >
            Todas
          </Link>
          {FILTER_STATUSES.map((s) => (
            <Link
              key={s}
              href={buildHref({ status: status === s ? undefined : s, page: 1 })}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                status === s ? STATUS_CLASS[s] : 'bg-white text-slate-500 ring-slate-200 hover:ring-slate-300'
              }`}
            >
              {STATUS_LABEL[s]}
            </Link>
          ))}
        </div>

        {/* Active filters indicator */}
        {(status || customerId) && (
          <Link
            href="/tasks"
            className="ml-1 text-xs text-slate-400 underline hover:text-slate-600"
          >
            Limpar filtros
          </Link>
        )}
      </div>

      {/* Content */}
      {tasks.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
          <p className="text-sm text-slate-400">Nenhuma tarefa encontrada.</p>
        </div>
      ) : isGrouped ? (
        /* Grouped by customer */
        <div className="flex flex-col gap-6">
          {[...grouped.entries()].map(([cid, group]) => (
            <div key={cid} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                <Link
                  href={`/customers/${cid}/tasks`}
                  className="text-sm font-semibold text-slate-900 hover:text-indigo-600"
                >
                  {group.name}
                </Link>
                <span className="text-xs text-slate-400">{group.tasks.length} tarefa(s)</span>
              </div>
              <TaskTable tasks={group.tasks} customerId={cid} buildHref={buildHref} showCustomer={false} />
            </div>
          ))}
        </div>
      ) : (
        /* Flat list */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <TaskTable tasks={tasks} buildHref={buildHref} showCustomer />
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={buildHref({ page: currentPage - 1 })}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                ← Anterior
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={buildHref({ page: currentPage + 1 })}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                Próxima →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TaskTable({
  tasks,
  customerId,
  showCustomer,
  buildHref,
}: {
  tasks: Task[]
  customerId?: string
  showCustomer: boolean
  buildHref: (o: Partial<SearchParams & { page: number }>) => string
}) {
  return (
    <table className="min-w-full divide-y divide-slate-200">
      <thead className="bg-slate-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tarefa
          </th>
          {showCustomer && (
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 lg:table-cell">
              Cliente
            </th>
          )}
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
          </th>
          <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">
            ICE
          </th>
          <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">
            Prazo
          </th>
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {tasks.map((task) => (
          <tr key={task.id} className="transition-colors hover:bg-slate-50">
            <td className="px-4 py-3">
              <Link
                href={`/customers/${task.customerId}/tasks/${task.id}`}
                className="line-clamp-1 text-sm font-medium text-slate-900 hover:text-indigo-600"
              >
                {task.title}
              </Link>
              {task.description && (
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{task.description}</p>
              )}
            </td>
            {showCustomer && (
              <td className="hidden px-4 py-3 lg:table-cell">
                <Link
                  href={`/customers/${task.customerId}/tasks`}
                  className="text-xs text-slate-600 hover:text-indigo-600 hover:underline"
                >
                  {task.customerName ?? task.customerId.slice(0, 8)}
                </Link>
              </td>
            )}
            <td className="px-4 py-3">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[task.status]}`}>
                {STATUS_LABEL[task.status]}
              </span>
            </td>
            <td className="hidden px-4 py-3 sm:table-cell">
              {task.iceScore !== null ? (
                <span className="text-xs font-medium text-orange-600">{task.iceScore.toFixed(1)}</span>
              ) : (
                <span className="text-xs text-slate-300">—</span>
              )}
            </td>
            <td className="hidden px-4 py-3 md:table-cell">
              {task.endAt ? (
                <span className="text-xs text-slate-500">
                  {new Date(task.endAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </span>
              ) : (
                <span className="text-xs text-slate-300">—</span>
              )}
            </td>
            <td className="px-4 py-3 text-right">
              <Link
                href={`/customers/${task.customerId}/tasks/${task.id}`}
                className="text-xs text-indigo-600 hover:underline"
              >
                Ver
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
