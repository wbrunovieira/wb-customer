import Link from 'next/link'
import { apiServer } from '@/lib/api-server'
import { Meeting, MeetingStatus, MeetingType, PaginatedResponse } from '@/lib/definitions'
import CancelMeetingButton from './_components/cancel-meeting-button'

export const metadata = { title: 'Reuniões — WB Customer' }

type CustomerItem = { id: string; name: string; email: string }
type MeetingWithCustomer = Meeting & { customer: CustomerItem; meetingType?: MeetingType }

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

type ResponseStatus = 'needsAction' | 'accepted' | 'declined' | 'tentative'

const RESPONSE_LABEL: Record<ResponseStatus, string> = {
  needsAction: 'Pendente',
  accepted: 'Confirmado',
  declined: 'Recusado',
  tentative: 'Tentativo',
}

const RESPONSE_CLASS: Record<ResponseStatus, string> = {
  needsAction: 'bg-amber-500/10 text-amber-400 ring-amber-600/20',
  accepted: 'bg-green-500/10 text-green-400 ring-green-600/20',
  declined: 'bg-red-500/10 text-red-400 ring-red-500/20',
  tentative: 'bg-canvas text-md ring-border',
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

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: filterStatus } = await searchParams

  let customers: CustomerItem[] = []
  let meetingTypes: MeetingType[] = []
  let meetings: MeetingWithCustomer[] = []

  try {
    const [customersRes, typesRes] = await Promise.all([
      apiServer.get<PaginatedResponse<CustomerItem>>('/api/v1/customers?limit=200'),
      apiServer.get<{ meetingTypes: MeetingType[] }>('/api/v1/meeting-types'),
    ])
    customers = customersRes.items
    meetingTypes = typesRes.meetingTypes

    const typeMap = new Map(meetingTypes.map((t) => [t.id, t]))

    const results = await Promise.allSettled(
      customers.map(async (c) => {
        const params = new URLSearchParams({ limit: '100' })
        if (filterStatus) params.set('status', filterStatus)
        const res = await apiServer.get<PaginatedResponse<Meeting>>(
          `/api/v1/customers/${c.id}/meetings?${params}`,
        )
        return res.items.map((m) => ({
          ...m,
          customer: c,
          meetingType: m.meetingTypeId ? typeMap.get(m.meetingTypeId) : undefined,
        }))
      }),
    )

    meetings = results
      .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
  } catch {
    // handled below
  }

  const tabs: { label: string; value: string | undefined }[] = [
    { label: 'Todas', value: undefined },
    { label: 'Agendadas', value: 'scheduled' },
    { label: 'Concluídas', value: 'ended' },
    { label: 'Canceladas', value: 'cancelled' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Reuniões</h1>
          <p className="mt-1 text-sm text-md">{meetings.length} reunião(ões) encontrada(s)</p>
        </div>
        <Link
          href="/meetings/new"
          className="flex items-center gap-2 rounded-lg btn-brand px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nova Reunião
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const isActive = filterStatus === tab.value
          const href = tab.value ? `/meetings?status=${tab.value}` : '/meetings'
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
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface gap-2">
          <p className="text-sm text-lo">Nenhuma reunião encontrada.</p>
          {customers.length === 0 && (
            <Link href="/customers" className="text-xs text-accent hover:underline">
              Cadastre um cliente primeiro
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-strong bg-surface shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-canvas">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Reunião</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Início</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Cliente</th>
                <th className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {meetings.map((m) => (
                <tr key={`${m.customer.id}-${m.id}`} className="transition-colors hover:bg-elevated">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-hi">{m.title}</p>
                    {m.description && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-lo">{m.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/customers/${m.customer.id}/meetings`}
                      className="text-sm text-accent hover:underline"
                    >
                      {m.customer.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    {m.meetingType ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: m.meetingType.color }}
                      >
                        {m.meetingType.name}
                      </span>
                    ) : (
                      <span className="text-sm text-lo">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-md">{formatDateTime(m.startAt)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[m.status]}`}>
                      {STATUS_LABEL[m.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const attendee = m.attendees.find((a) => a.email === m.customer.email)
                      if (!attendee) return <span className="text-sm text-lo">—</span>
                      const rs = attendee.responseStatus as ResponseStatus
                      return (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${RESPONSE_CLASS[rs]}`}>
                          {RESPONSE_LABEL[rs]}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {m.meetLink && m.status === 'scheduled' && (
                        <a
                          href={m.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-accent hover:underline"
                        >
                          Entrar
                        </a>
                      )}
                      <Link
                        href={`/customers/${m.customer.id}/meetings/${m.id}`}
                        className="text-sm text-md hover:underline"
                      >
                        Ver
                      </Link>
                      {m.status === 'scheduled' && (
                        <CancelMeetingButton customerId={m.customer.id} meetingId={m.id} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
