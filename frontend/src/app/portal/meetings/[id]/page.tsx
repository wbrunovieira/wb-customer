import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { Meeting, MeetingStatus } from '@/lib/definitions'

export const metadata = { title: 'Detalhe da Reunião — Portal do Cliente' }

const STATUS_LABEL: Record<MeetingStatus, string> = {
  scheduled: 'Agendada',
  ended: 'Concluída',
  cancelled: 'Cancelada',
}

const STATUS_CLASS: Record<MeetingStatus, string> = {
  scheduled: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  ended: 'bg-green-50 text-green-700 ring-green-600/20',
  cancelled: 'bg-slate-50 text-slate-500 ring-slate-400/20',
}

type ResponseStatus = 'needsAction' | 'accepted' | 'declined' | 'tentative'
const RSVP_LABEL: Record<ResponseStatus, string> = {
  needsAction: 'Pendente',
  accepted: 'Confirmado',
  declined: 'Recusou',
  tentative: 'Tentativo',
}
const RSVP_CLASS: Record<ResponseStatus, string> = {
  needsAction: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  accepted: 'bg-green-50 text-green-700 ring-green-600/20',
  declined: 'bg-red-50 text-red-600 ring-red-500/20',
  tentative: 'bg-slate-50 text-slate-500 ring-slate-400/20',
}

function formatDateTime(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDuration(startIso: string, endIso: string | null) {
  if (!endIso) return null
  const diff = new Date(endIso).getTime() - new Date(startIso).getTime()
  if (diff <= 0) return null
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export default async function PortalMeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let meeting: Meeting
  try {
    const res = await apiServer.get<{ meeting: Meeting }>(`/api/v1/portal/meetings/${id}`)
    meeting = res.meeting
  } catch {
    notFound()
  }

  const duration = formatDuration(meeting.startAt, meeting.endAt)

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Back link */}
      <Link
        href="/portal/meetings"
        className="flex items-center gap-1.5 self-start text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Reuniões
      </Link>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/portal/meetings" className="hover:text-slate-900">Reuniões</Link>
        <span>/</span>
        <span className="text-slate-900">{meeting.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{meeting.title}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[meeting.status]}`}>
              {STATUS_LABEL[meeting.status]}
            </span>
            {duration && (
              <span className="text-sm text-slate-500">{duration}</span>
            )}
          </div>
        </div>
        {meeting.meetLink && meeting.status === 'scheduled' && (
          <a
            href={meeting.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            Entrar no Meet
          </a>
        )}
      </div>

      {/* Details card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-5">

        {/* Date/time */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Data e Horário</p>
          <p className="text-sm text-slate-900">{formatDateTime(meeting.startAt)}</p>
          {meeting.endAt && (
            <p className="text-sm text-slate-500">até {formatDateTime(meeting.endAt)}</p>
          )}
        </div>

        {meeting.description && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Descrição</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{meeting.description}</p>
          </div>
        )}

        {/* Attendees */}
        {meeting.attendees.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Participantes</p>
            <div className="flex flex-wrap gap-2">
              {meeting.attendees.map((a) => (
                <div key={a.email} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
                  <span className="text-sm text-slate-900">{a.email}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${RSVP_CLASS[a.responseStatus as ResponseStatus]}`}>
                    {RSVP_LABEL[a.responseStatus as ResponseStatus]}
                  </span>
                  {a.organizer && (
                    <span className="text-xs text-slate-400">(organizador)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recording */}
        {meeting.recordingUrl && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Gravação</p>
            <a
              href={meeting.recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
              Assistir gravação
            </a>
          </div>
        )}
      </div>

      {/* Summary */}
      {meeting.meetingSummary && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">Resumo da Reunião</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{meeting.meetingSummary}</p>
        </div>
      )}

      {/* Transcript */}
      {meeting.transcriptText && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">Transcrição</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{meeting.transcriptText}</p>
        </div>
      )}

      <Link href="/portal/meetings" className="self-start text-sm text-slate-500 hover:text-slate-900">
        ← Voltar para reuniões
      </Link>
    </div>
  )
}
