import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { Customer, CurrentUser, Task, Sprint, TaskTag, TaskStatus, TaskComment } from '@/lib/definitions'
import ChecklistSection from './_components/checklist-section'
import UpdateTaskForm from './_components/update-task-form'
import TagsSection from './_components/tags-section'
import StatusChanger from './_components/status-changer'
import SubtasksSection from './_components/subtasks-section'
import CommentsSection from './_components/comments-section'
import DeleteTaskButton from '../_components/delete-task-button'
import TimeTracker from './_components/time-tracker'

export const metadata = { title: 'Tarefa — WB Customer' }

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
  idea_could: 'bg-purple-500/10 text-purple-400 ring-purple-600/20',
  idea_should: 'bg-violet-500/10 text-violet-400 ring-violet-600/20',
  backlog: 'bg-canvas text-md ring-slate-400/20',
  todo: 'bg-blue-500/10 text-blue-400 ring-blue-600/20',
  in_progress: 'bg-amber-500/10 text-amber-400 ring-amber-600/20',
  review: 'bg-indigo-500/10 text-indigo-400 ring-indigo-600/20',
  done: 'bg-green-500/10 text-green-400 ring-green-600/20',
  cancelled: 'bg-red-500/10 text-red-400 ring-red-500/20',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function IceScoreDisplay({ impact, confidence, effort, iceScore }: {
  impact: number | null
  confidence: number | null
  effort: number | null
  iceScore: number | null
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-md">ICE Score</h2>
      <div className="grid grid-cols-3 gap-4 text-center mb-4">
        <div>
          <div className="text-2xl font-bold text-hi">{impact ?? '—'}</div>
          <div className="text-xs text-lo mt-0.5">Impacto</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-hi">{confidence ?? '—'}</div>
          <div className="text-xs text-lo mt-0.5">Confiança</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-hi">{effort ?? '—'}</div>
          <div className="text-xs text-lo mt-0.5">Esforço</div>
        </div>
      </div>
      {iceScore !== null && (
        <div className="flex items-center justify-center rounded-lg bg-orange-500/10 py-2">
          <span className="text-lg font-bold text-orange-400">ICE {iceScore.toFixed(1)}</span>
        </div>
      )}
      {iceScore === null && (
        <p className="text-center text-xs text-lo">Preencha impacto, confiança e esforço para calcular.</p>
      )}
    </div>
  )
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>
}) {
  const { id, taskId } = await params

  let customer: Customer
  let task: Task
  let sprints: Sprint[] = []
  let allTags: TaskTag[] = []
  let comments: TaskComment[] = []
  let currentUser: CurrentUser | null = null
  let activeTimeEntryId: string | null = null
  let activeEntryStartedAt: string | null = null

  try {
    customer = await apiServer.get<Customer>(`/api/v1/customers/${id}`)
  } catch {
    notFound()
  }

  try {
    const res = await apiServer.get<{ task: Task }>(`/api/v1/customers/${id}/tasks/${taskId}`)
    task = res.task
  } catch {
    notFound()
  }

  try {
    const [sprintsRes, tagsRes, commentsRes, userRes] = await Promise.all([
      apiServer.get<{ sprints: Sprint[] }>(`/api/v1/customers/${id}/sprints`),
      apiServer.get<{ tags: TaskTag[] }>(`/api/v1/task-tags?customerId=${id}`),
      apiServer.get<{ comments: TaskComment[] }>(`/api/v1/customers/${id}/tasks/${taskId}/comments`),
      apiServer.get<CurrentUser>('/api/v1/auth/me'),
    ])
    sprints = sprintsRes.sprints
    allTags = tagsRes.tags
    comments = commentsRes.comments
    currentUser = userRes
  } catch {
    // ignore
  }

  try {
    if (currentUser) {
      const timeEntriesRes = await apiServer.get<{
        entries: { id: string; startedAt: string; isRunning: boolean }[]
        activeEntryId: string | null
      }>(`/api/v1/customers/${id}/tasks/${taskId}/time-entries`)
      activeTimeEntryId = timeEntriesRes.activeEntryId
      const activeEntry = timeEntriesRes.entries.find((e) => e.id === activeTimeEntryId)
      activeEntryStartedAt = activeEntry?.startedAt ?? null
    }
  } catch {
    // ignore
  }

  const t = task!
  const checklist = t.checklist ?? []
  const subtasks = t.subtasks ?? []
  const attachedTags = t.tags ?? []
  const activityLog = t.activityLog ?? []

  const sprint = sprints.find((s) => s.id === t.sprintId)

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs + header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-md flex-wrap">
            <Link href="/customers" className="hover:text-hi">Clientes</Link>
            <span>/</span>
            <Link href={`/customers/${id}`} className="hover:text-hi">{customer!.name}</Link>
            <span>/</span>
            <Link href={`/customers/${id}/tasks`} className="hover:text-hi">Tarefas</Link>
            <span>/</span>
            <span className="truncate max-w-xs text-hi">{t.title}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-hi">{t.title}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[t.status]}`}>
              {STATUS_LABEL[t.status]}
            </span>
          </div>
          {sprint && (
            <p className="mt-1 text-sm text-lo">Sprint: {sprint.name}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/customers/${id}/tasks`}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-md hover:bg-canvas"
          >
            ← Voltar
          </Link>
          <DeleteTaskButton customerId={id} taskId={t.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: details + checklist + activity */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Description */}
          {t.description && (
            <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-md">Descrição</h2>
              <p className="text-sm text-hi whitespace-pre-wrap">{t.description}</p>
            </div>
          )}

          {/* Progress */}
          {t.progress > 0 && (
            <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-md">Progresso</h2>
                <span className="text-sm font-medium text-hi">{t.progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-elevated">
                <div
                  className="h-2 rounded-full bg-indigo-500/100"
                  style={{ width: `${t.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Checklist */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <ChecklistSection customerId={id} taskId={t.id} items={checklist} />
          </div>

          {/* Subtasks */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <SubtasksSection customerId={id} taskId={t.id} subtasks={subtasks} />
          </div>

          {/* Comments */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <CommentsSection
              customerId={id}
              taskId={t.id}
              comments={comments}
              currentUserId={currentUser?.id ?? ''}
            />
          </div>

          {/* Edit form */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-md">Editar Tarefa</h2>
            <UpdateTaskForm customerId={id} task={t} sprints={sprints} />
          </div>

          {/* Activity log */}
          {activityLog.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-md">Histórico</h2>
              <ul className="flex flex-col gap-2">
                {activityLog.map((log) => (
                  <li key={log.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-border-strong" />
                    <div className="flex-1">
                      <span className="text-hi">{log.action}</span>
                      {log.fromValue && log.toValue && (
                        <span className="text-lo ml-1">
                          ({log.fromValue} → {log.toValue})
                        </span>
                      )}
                      <span className="ml-2 text-xs text-lo">
                        {new Date(log.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right column: status, dates, ICE, tags */}
        <div className="flex flex-col gap-6">
          {/* Status changer */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-md">Status</h2>
            <StatusChanger customerId={id} taskId={t.id} currentStatus={t.status} />
          </div>

          {/* Dates */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-md">Datas</h2>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="text-xs text-lo">Início</dt>
                <dd className="mt-0.5 text-sm text-hi">{formatDate(t.startAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-lo">Prazo</dt>
                <dd className="mt-0.5 text-sm text-hi">{formatDate(t.endAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-lo">Criado em</dt>
                <dd className="mt-0.5 text-sm text-hi">{formatDate(t.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-lo">Atualizado em</dt>
                <dd className="mt-0.5 text-sm text-hi">{formatDate(t.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {/* ICE Score */}
          <IceScoreDisplay
            impact={t.impact}
            confidence={t.confidence}
            effort={t.effort}
            iceScore={t.iceScore}
          />

          {/* Time Tracker */}
          <TimeTracker
            customerId={id}
            taskId={t.id}
            trackedSeconds={t.trackedSeconds}
            isActive={!!activeTimeEntryId}
            activeStartedAt={activeEntryStartedAt}
          />

          {/* Tags */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <TagsSection
              customerId={id}
              taskId={t.id}
              attachedTags={attachedTags}
              allTags={allTags}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
