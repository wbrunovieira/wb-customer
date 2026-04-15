import Link from 'next/link'
import { apiServer } from '@/lib/api-server'
import { Meeting, MeetingStatus, PaginatedResponse } from '@/lib/definitions'

export const metadata = { title: 'Reuniões — Portal do Cliente' }

const STATUS_LABEL: Record<MeetingStatus, string> = {
  scheduled: 'Agendada',
  ended: 'Concluída',
  cancelled: 'Cancelada',
}

const STATUS_CLASS: Record<MeetingStatus, string> = {
  scheduled: 'bg-blue-500/10 text-blue-400 ring-blue-600/20',
  ended: 'bg-green-500/10 text-green-400 ring-green-600/20',
  cancelled: 'bg-canvas text-md ring-border',
}

function formatDateTime(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function PortalMeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: filterStatus } = await searchParams

  let meetings: Meeting[] = []
  let total = 0

  try {
    const params = new URLSearchParams({ limit: '100' })
    if (filterStatus) params.set('status', filterStatus)
    const res = await apiServer.get<PaginatedResponse<Meeting>>(`/api/v1/portal/meetings?${params}`)
    meetings = res.items.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
    total = res.total
  } catch {
    // show empty
  }

  const tabs: { label: string; value: string | undefined }[] = [
    { label: 'Todas', value: undefined },
    { label: 'Agendadas', value: 'scheduled' },
    { label: 'Concluídas', value: 'ended' },
    { label: 'Canceladas', value: 'cancelled' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Reuniões</h1>
        <p className="mt-1 text-sm text-md">{total} reunião(ões)</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const isActive = filterStatus === tab.value
          const href = tab.value ? `/portal/meetings?status=${tab.value}` : '/portal/meetings'
          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-brand text-white'
                  : 'text-md hover:text-hi'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {meetings.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lo">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-sm font-medium text-md">
            {filterStatus ? 'Nenhuma reunião com este status.' : 'Nenhuma reunião disponível.'}
          </p>
          {filterStatus && (
            <Link href="/portal/meetings" className="text-xs text-accent hover:underline">
              Ver todas as reuniões
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {meetings.map((m) => (
            <div key={m.id} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-hi">{m.title}</h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[m.status]}`}>
                      {STATUS_LABEL[m.status]}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-md">
                    <span className="flex items-center gap-1">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {formatDateTime(m.startAt)}
                      {m.endAt && ` → ${formatDateTime(m.endAt)}`}
                    </span>
                    {m.attendees.length > 0 && (
                      <span className="flex items-center gap-1">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                        {m.attendees.length} participante(s)
                      </span>
                    )}
                  </div>

                  {m.description && (
                    <p className="mt-2 text-sm text-md">{m.description}</p>
                  )}

                  {m.meetingSummary && (
                    <div className="mt-3 rounded-lg bg-canvas p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-md mb-1">Resumo</p>
                      <p className="text-sm text-hi whitespace-pre-wrap">{m.meetingSummary}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {m.meetLink && m.status === 'scheduled' && (
                    <a
                      href={m.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg btn-brand px-3 py-1.5 text-xs font-medium text-white"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                      Entrar no Meet
                    </a>
                  )}
                  <Link
                    href={`/portal/meetings/${m.id}`}
                    className="text-xs text-accent hover:underline"
                  >
                    Ver detalhes
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
