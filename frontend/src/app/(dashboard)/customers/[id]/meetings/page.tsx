import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { Customer, Meeting, MeetingStatus, MeetingType, PaginatedResponse } from '@/lib/definitions'
import CancelMeetingButton from '@/app/(dashboard)/meetings/_components/cancel-meeting-button'
import SummaryForm from './_components/summary-form'

export const metadata = { title: 'Reuniões do Cliente — WB Customer' }

const STATUS_LABEL: Record<MeetingStatus, string> = {
  scheduled: 'Agendada',
  ended: 'Concluída',
  cancelled: 'Cancelada',
}

const STATUS_CLASS: Record<MeetingStatus, string> = {
  scheduled: 'bg-blue-500/10 text-blue-400 ring-blue-600/20',
  ended: 'bg-green-500/10 text-green-400 ring-green-600/20',
  cancelled: 'bg-canvas text-md ring-slate-400/20',
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

export default async function CustomerMeetingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let customer: Customer
  let meetings: Meeting[] = []
  let meetingTypes: MeetingType[] = []

  try {
    customer = await apiServer.get<Customer>(`/api/v1/customers/${id}`)
  } catch {
    notFound()
  }

  try {
    const [meetingsRes, typesRes] = await Promise.all([
      apiServer.get<PaginatedResponse<Meeting>>(`/api/v1/customers/${id}/meetings?limit=100`),
      apiServer.get<{ meetingTypes: MeetingType[] }>('/api/v1/meeting-types'),
    ])
    meetings = meetingsRes.items.sort(
      (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
    )
    meetingTypes = typesRes.meetingTypes
  } catch {
    // show empty
  }

  const typeMap = new Map(meetingTypes.map((t) => [t.id, t]))

  const subTabs = [
    { href: `/customers/${id}/documents`, label: 'Documentos' },
    { href: `/customers/${id}/meetings`, label: 'Reuniões' },
    { href: `/customers/${id}/portal-users`, label: 'Portal' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-md">
            <Link href="/customers" className="hover:text-hi">Clientes</Link>
            <span>/</span>
            <Link href={`/customers/${id}`} className="hover:text-hi">{customer!.name}</Link>
            <span>/</span>
            <span className="text-hi">Reuniões</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-hi">
            Reuniões — {customer!.name}
          </h1>
          <p className="mt-1 text-sm text-md">{meetings.length} reunião(ões)</p>
        </div>
        <Link
          href={`/meetings/new?customerId=${id}`}
          className="flex items-center gap-2 rounded-lg btn-brand px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Agendar Reunião
        </Link>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex gap-1 border-b border-border">
        {subTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab.label === 'Reuniões'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-md hover:text-hi'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {meetings.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface gap-2">
          <p className="text-sm text-lo">Nenhuma reunião agendada.</p>
          <Link
            href={`/meetings/new?customerId=${id}`}
            className="text-xs text-indigo-600 hover:underline"
          >
            Agendar primeira reunião
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {meetings.map((m) => {
            const type = m.meetingTypeId ? typeMap.get(m.meetingTypeId) : undefined
            return (
              <div key={m.id} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-hi">{m.title}</h3>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[m.status]}`}>
                        {STATUS_LABEL[m.status]}
                      </span>
                      {type && (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: type.color }}
                        >
                          {type.name}
                        </span>
                      )}
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

                    {/* Attendees */}
                    {m.attendees.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {m.attendees.map((a) => (
                          <span
                            key={a.email}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                              a.responseStatus === 'accepted'
                                ? 'bg-green-500/10 text-green-400 ring-green-600/20'
                                : a.responseStatus === 'declined'
                                  ? 'bg-red-500/10 text-red-400 ring-red-500/20'
                                  : 'bg-canvas text-md ring-slate-400/20'
                            }`}
                          >
                            {a.email}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Summary */}
                    {m.meetingSummary && (
                      <div className="mt-3 rounded-lg bg-canvas p-3">
                        <p className="text-xs font-medium text-md uppercase tracking-wide mb-1">Resumo</p>
                        <p className="text-sm text-hi whitespace-pre-wrap">{m.meetingSummary}</p>
                      </div>
                    )}

                    {/* Summary form */}
                    {(m.status === 'ended' || m.status === 'scheduled') && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs text-indigo-600 hover:underline">
                          {m.meetingSummary ? 'Editar resumo' : 'Adicionar resumo'}
                        </summary>
                        <div className="mt-2">
                          <SummaryForm
                            customerId={id}
                            meetingId={m.id}
                            currentSummary={m.meetingSummary}
                          />
                        </div>
                      </details>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
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
                      href={`/customers/${id}/meetings/${m.id}`}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-md hover:bg-canvas"
                    >
                      Ver detalhes
                    </Link>
                    {m.status === 'scheduled' && (
                      <CancelMeetingButton customerId={id} meetingId={m.id} />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
