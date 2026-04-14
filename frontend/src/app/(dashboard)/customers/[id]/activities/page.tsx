import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { Customer, Activity, ActivityType, ActivityStatus, PaginatedResponse } from '@/lib/definitions'
import NewActivityForm from './_components/new-activity-form'
import DeleteActivityButton from './_components/delete-activity-button'

export const metadata = { title: 'Atividades — WB Customer' }

const TYPE_LABEL: Record<ActivityType, string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  phone_call: 'Ligação',
  note: 'Nota',
  meeting: 'Reunião',
}

const TYPE_ICON: Record<ActivityType, React.ReactNode> = {
  email: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  whatsapp: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  phone_call: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  note: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  meeting: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
}

const TYPE_COLOR: Record<ActivityType, string> = {
  email: 'bg-blue-100 text-blue-700',
  whatsapp: 'bg-green-100 text-green-700',
  phone_call: 'bg-purple-100 text-purple-700',
  note: 'bg-amber-100 text-amber-700',
  meeting: 'bg-indigo-100 text-indigo-700',
}

const STATUS_LABEL: Record<ActivityStatus, string> = {
  scheduled: 'Agendado',
  open: 'Aberto',
  done: 'Concluído',
  cancelled: 'Cancelado',
  skipped: 'Ignorado',
}

const STATUS_CLASS: Record<ActivityStatus, string> = {
  scheduled: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  open: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  done: 'bg-green-50 text-green-700 ring-green-600/20',
  cancelled: 'bg-slate-50 text-slate-500 ring-slate-400/20',
  skipped: 'bg-red-50 text-red-600 ring-red-500/20',
}

function formatDate(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

import React from 'react'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string; status?: string; newActivity?: string }>
}

export default async function CustomerActivitiesPage({ params, searchParams }: Props) {
  const { id } = await params
  const { type, status, newActivity } = await searchParams

  let customer: Customer
  let activities: Activity[] = []
  let total = 0

  try {
    customer = await apiServer.get<Customer>(`/api/v1/customers/${id}`)
  } catch {
    notFound()
  }

  try {
    const query = new URLSearchParams()
    if (type) query.set('type', type)
    if (status) query.set('status', status)
    query.set('limit', '100')

    const res = await apiServer.get<PaginatedResponse<Activity>>(
      `/api/v1/customers/${id}/activities?${query}`,
    )
    activities = res.items
    total = res.total
  } catch {
    // show empty
  }

  const subTabs = [
    { href: `/customers/${id}/documents`, label: 'Documentos' },
    { href: `/customers/${id}/meetings`, label: 'Reuniões' },
    { href: `/customers/${id}/tasks`, label: 'Tarefas' },
    { href: `/customers/${id}/activities`, label: 'Atividades', active: true },
    { href: `/customers/${id}/portal-users`, label: 'Portal' },
  ]

  const typeFilters: { value: string; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'email', label: 'E-mail' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'phone_call', label: 'Ligação' },
    { value: 'note', label: 'Nota' },
    { value: 'meeting', label: 'Reunião' },
  ]

  const statusFilters: { value: string; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'open', label: 'Aberto' },
    { value: 'done', label: 'Concluído' },
    { value: 'scheduled', label: 'Agendado' },
  ]

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
            <span className="text-slate-900">Atividades</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Atividades — {customer!.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{total} atividade(s)</p>
        </div>

        <Link
          href={`/customers/${id}/activities?newActivity=1${type ? `&type=${type}` : ''}${status ? `&status=${status}` : ''}`}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nova Atividade
        </Link>
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

      {/* New activity inline form */}
      {newActivity && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Nova Atividade</h3>
          <NewActivityForm customerId={id} />
          <Link
            href={`/customers/${id}/activities`}
            className="mt-3 inline-block text-xs text-slate-500 hover:text-slate-700"
          >
            Cancelar
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Type filter */}
        <div className="flex flex-wrap gap-1.5">
          {typeFilters.map((f) => (
            <Link
              key={f.value}
              href={`/customers/${id}/activities?${f.value ? `type=${f.value}` : ''}${status ? `&status=${status}` : ''}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                type === f.value || (!type && !f.value)
                  ? 'bg-indigo-600 text-white ring-indigo-600'
                  : 'bg-white text-slate-500 ring-slate-200 hover:ring-slate-300'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-1.5">
          {statusFilters.map((f) => (
            <Link
              key={f.value}
              href={`/customers/${id}/activities?${type ? `type=${type}&` : ''}${f.value ? `status=${f.value}` : ''}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                status === f.value || (!status && !f.value)
                  ? 'bg-slate-800 text-white ring-slate-800'
                  : 'bg-white text-slate-500 ring-slate-200 hover:ring-slate-300'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white gap-2">
          <p className="text-sm text-slate-400">Nenhuma atividade encontrada.</p>
          <Link
            href={`/customers/${id}/activities?newActivity=1`}
            className="text-xs text-indigo-600 hover:underline"
          >
            Registrar primeira atividade
          </Link>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />

          <div className="flex flex-col gap-0">
            {activities.map((activity) => {
              const actType = activity.type as ActivityType
              const actStatus = activity.status as ActivityStatus
              return (
                <div key={activity.id} className="relative flex gap-4 pb-6">
                  {/* Icon bubble */}
                  <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TYPE_COLOR[actType] ?? 'bg-slate-100 text-slate-600'}`}>
                    {TYPE_ICON[actType]}
                  </div>

                  {/* Card */}
                  <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[actType]}`}>
                          {TYPE_LABEL[actType] ?? activity.type}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[actStatus] ?? 'bg-slate-50 text-slate-600 ring-slate-400/20'}`}>
                          {STATUS_LABEL[actStatus] ?? activity.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400">
                          {formatDate(activity.occurredAt ?? activity.createdAt)}
                        </span>
                        <DeleteActivityButton customerId={id} activityId={activity.id} />
                      </div>
                    </div>

                    {activity.subject && (
                      <h3 className="mt-2 text-sm font-semibold text-slate-900">{activity.subject}</h3>
                    )}

                    {activity.description && (
                      <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{activity.description}</p>
                    )}

                    {activity.scheduledAt && actStatus === 'scheduled' && (
                      <p className="mt-2 text-xs text-slate-500">
                        Agendado para: {formatDate(activity.scheduledAt)}
                      </p>
                    )}

                    {activity.durationSecs && (
                      <p className="mt-1 text-xs text-slate-400">
                        Duração: {Math.floor(activity.durationSecs / 60)}min
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
