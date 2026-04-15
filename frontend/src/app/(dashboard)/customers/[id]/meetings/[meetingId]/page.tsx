import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { Customer, Meeting, MeetingStatus, MeetingType } from '@/lib/definitions'
import CancelMeetingButton from '@/app/(dashboard)/meetings/_components/cancel-meeting-button'
import SummaryForm from '../_components/summary-form'

export const metadata = { title: 'Detalhes da Reunião — WB Customer' }

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

const RSVP_LABEL: Record<string, string> = {
  needsAction: 'Pendente',
  accepted: 'Confirmado',
  declined: 'Recusado',
  tentative: 'Tentativo',
}

const RSVP_CLASS: Record<string, string> = {
  needsAction: 'bg-amber-500/10 text-amber-400 ring-amber-600/20',
  accepted: 'bg-green-500/10 text-green-400 ring-green-600/20',
  declined: 'bg-red-500/10 text-red-400 ring-red-500/20',
  tentative: 'bg-canvas text-md ring-border',
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function durationMinutes(start: string | null, end: string | null): string | null {
  if (!start || !end) return null
  const diff = new Date(end).getTime() - new Date(start).getTime()
  if (diff <= 0) return null
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string; meetingId: string }>
}) {
  const { id, meetingId } = await params

  let customer: Customer
  let meeting: Meeting
  let meetingType: MeetingType | null = null

  try {
    customer = await apiServer.get<Customer>(`/api/v1/customers/${id}`)
  } catch {
    notFound()
  }

  try {
    const res = await apiServer.get<{ meeting: Meeting }>(`/api/v1/customers/${id}/meetings/${meetingId}`)
    meeting = res.meeting
  } catch {
    notFound()
  }

  if (meeting!.meetingTypeId) {
    try {
      const res = await apiServer.get<{ meetingTypes: MeetingType[] }>('/api/v1/meeting-types')
      meetingType = res.meetingTypes.find((t) => t.id === meeting!.meetingTypeId) ?? null
    } catch {
      // ignore
    }
  }

  const m = meeting!
  const scheduledDuration = durationMinutes(m.startAt, m.endAt)
  const actualDuration = durationMinutes(m.actualStartAt, m.actualEndAt)

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs + header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-md">
            <Link href="/customers" className="hover:text-hi">Clientes</Link>
            <span>/</span>
            <Link href={`/customers/${id}`} className="hover:text-hi">{customer!.name}</Link>
            <span>/</span>
            <Link href={`/customers/${id}/meetings`} className="hover:text-hi">Reuniões</Link>
            <span>/</span>
            <span className="text-hi truncate max-w-xs">{m.title}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-white">{m.title}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[m.status]}`}>
              {STATUS_LABEL[m.status]}
            </span>
            {meetingType && (
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: meetingType.color }}
              >
                {meetingType.name}
              </span>
            )}
          </div>
          {m.description && (
            <p className="mt-1 text-sm text-md">{m.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {m.meetLink && m.status === 'scheduled' && (
            <a
              href={m.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg btn-brand px-4 py-2 text-sm font-medium text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              Entrar no Meet
            </a>
          )}
          {m.status === 'scheduled' && (
            <CancelMeetingButton customerId={id} meetingId={m.id} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: details + attendees + summary form */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Date/time card */}
          <div className="rounded-xl border border-border-strong bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-md mb-4">Datas</h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-lo">Início agendado</dt>
                <dd className="mt-0.5 text-sm text-hi">{formatDateTime(m.startAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-lo">Fim agendado</dt>
                <dd className="mt-0.5 text-sm text-hi">{m.endAt ? formatDateTime(m.endAt) : '—'}</dd>
              </div>
              {scheduledDuration && (
                <div>
                  <dt className="text-xs text-lo">Duração prevista</dt>
                  <dd className="mt-0.5 text-sm text-hi">{scheduledDuration}</dd>
                </div>
              )}
              {m.actualStartAt && (
                <div>
                  <dt className="text-xs text-lo">Início real</dt>
                  <dd className="mt-0.5 text-sm text-hi">{formatDateTime(m.actualStartAt)}</dd>
                </div>
              )}
              {m.actualEndAt && (
                <div>
                  <dt className="text-xs text-lo">Fim real</dt>
                  <dd className="mt-0.5 text-sm text-hi">{formatDateTime(m.actualEndAt)}</dd>
                </div>
              )}
              {actualDuration && (
                <div>
                  <dt className="text-xs text-lo">Duração real</dt>
                  <dd className="mt-0.5 text-sm font-medium text-hi">{actualDuration}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Attendees */}
          {(m.attendees?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-border-strong bg-surface p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-md mb-4">Participantes</h2>
              <ul className="flex flex-col gap-2">
                {(m.attendees ?? []).map((a) => (
                  <li key={a.email} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-hi">{a.email}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${RSVP_CLASS[a.responseStatus] ?? RSVP_CLASS.needsAction}`}>
                      {RSVP_LABEL[a.responseStatus] ?? a.responseStatus}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary */}
          <div className="rounded-xl border border-border-strong bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-md mb-4">Resumo</h2>
            {m.meetingSummary ? (
              <p className="text-sm text-hi whitespace-pre-wrap mb-4">{m.meetingSummary}</p>
            ) : (
              <p className="text-sm text-lo mb-4">Nenhum resumo disponível.</p>
            )}
            {(m.status === 'ended' || m.status === 'scheduled') && (
              <SummaryForm
                customerId={id}
                meetingId={m.id}
                currentSummary={m.meetingSummary}
              />
            )}
          </div>
        </div>

        {/* Right column: recording + transcript */}
        <div className="flex flex-col gap-6">
          {/* Recording */}
          <div className="rounded-xl border border-border-strong bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-md mb-4">Gravação</h2>
            {m.recordingDriveId ? (
              <div className="flex flex-col gap-3">
                <div className="overflow-hidden rounded-lg border border-border bg-black aspect-video">
                  <iframe
                    src={`https://drive.google.com/file/d/${m.recordingDriveId}/preview`}
                    className="h-full w-full"
                    allow="autoplay"
                    title="Gravação da reunião"
                  />
                </div>
                {m.recordingUrl && (
                  <a
                    href={m.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    Abrir no Google Drive
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-lo">
                {m.status === 'ended'
                  ? 'Gravação não disponível (reunião pode não ter sido gravada).'
                  : 'Gravação disponível após o término da reunião.'}
              </p>
            )}
          </div>

          {/* Transcript */}
          <div className="rounded-xl border border-border-strong bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-md mb-4">Transcrição</h2>
            {m.transcriptText ? (
              <div className="flex flex-col gap-2">
                <div className="max-h-80 overflow-y-auto rounded-lg bg-canvas p-3">
                  <p className="text-sm text-hi whitespace-pre-wrap">{m.transcriptText}</p>
                </div>
                {m.nativeTranscriptUrl && (
                  <a
                    href={m.nativeTranscriptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    Ver transcrição completa no Drive
                  </a>
                )}
              </div>
            ) : m.nativeTranscriptUrl ? (
              <a
                href={m.nativeTranscriptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline"
              >
                Ver transcrição no Drive
              </a>
            ) : (
              <p className="text-sm text-lo">
                {m.status === 'ended'
                  ? 'Transcrição não disponível.'
                  : 'Transcrição disponível após o término da reunião.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
