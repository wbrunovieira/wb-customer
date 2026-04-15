'use client'

import { useActionState, useState } from 'react'
import { scheduleMeeting } from '@/app/actions/meetings'
import { CustomerListItem, MeetingFormState, MeetingType } from '@/lib/definitions'

type Props = {
  customers: CustomerListItem[]
  meetingTypes: MeetingType[]
  preselectedCustomerId?: string
}

export default function ScheduleMeetingForm({ customers, meetingTypes, preselectedCustomerId }: Props) {
  const preselectedCustomer = customers.find((c) => c.id === preselectedCustomerId)

  const [customerId, setCustomerId] = useState(preselectedCustomerId ?? '')
  const [customerEmail, setCustomerEmail] = useState(preselectedCustomer?.email ?? '')
  const [emailInput, setEmailInput] = useState('')
  const [extraEmails, setExtraEmails] = useState<string[]>([])

  // All attendees = customer email (if set) + extra emails, deduplicated
  const allEmails = customerEmail
    ? [customerEmail, ...extraEmails.filter((e) => e !== customerEmail)]
    : extraEmails

  const action = scheduleMeeting.bind(null, customerId)
  const [state, formAction, pending] = useActionState<MeetingFormState, FormData>(action, undefined)

  function handleCustomerChange(id: string) {
    setCustomerId(id)
    const customer = customers.find((c) => c.id === id)
    setCustomerEmail(customer?.email ?? '')
  }

  function addEmail() {
    const trimmed = emailInput.trim()
    if (trimmed && !extraEmails.includes(trimmed) && trimmed !== customerEmail) {
      setExtraEmails((prev) => [...prev, trimmed])
      setEmailInput('')
    }
  }

  function removeExtraEmail(email: string) {
    setExtraEmails((prev) => prev.filter((e) => e !== email))
  }

  function handleEmailKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addEmail()
    }
  }

  // Default start/end: next full hour, 1h duration
  const now = new Date()
  now.setMinutes(0, 0, 0)
  now.setHours(now.getHours() + 1)
  const defaultStart = now.toISOString().slice(0, 16)
  now.setHours(now.getHours() + 1)
  const defaultEnd = now.toISOString().slice(0, 16)

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.message && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.message}
        </div>
      )}

      {/* hidden field for emails as comma-separated */}
      <input type="hidden" name="attendeeEmails" value={allEmails.join(',')} />

      {/* Customer */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-hi">
          Cliente <span className="text-red-500">*</span>
        </label>
        <select
          name="customerId"
          required
          value={customerId}
          onChange={(e) => handleCustomerChange(e.target.value)}
          className="rounded-lg border border-border-strong bg-elevated px-3 py-2 text-sm text-hi focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
        >
          <option value="">Selecione um cliente...</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-hi">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          type="text"
          required
          placeholder="Ex: Kickoff do Projeto"
          className="rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
        />
        {state?.errors?.title && <p className="text-xs text-red-400">{state.errors.title[0]}</p>}
      </div>

      {/* Meeting type */}
      {meetingTypes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-hi">Tipo de Reunião</label>
          <select
            name="meetingTypeId"
            className="rounded-lg border border-border-strong bg-elevated px-3 py-2 text-sm text-hi focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
          >
            <option value="">Sem tipo específico</option>
            {meetingTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.durationMinutes} min)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date/time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-hi">
            Início <span className="text-red-500">*</span>
          </label>
          <input
            name="startAt"
            type="datetime-local"
            required
            defaultValue={defaultStart}
            className="rounded-lg border border-border-strong bg-elevated px-3 py-2 text-sm text-hi focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
          />
          {state?.errors?.startAt && <p className="text-xs text-red-400">{state.errors.startAt[0]}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-hi">
            Término <span className="text-red-500">*</span>
          </label>
          <input
            name="endAt"
            type="datetime-local"
            required
            defaultValue={defaultEnd}
            className="rounded-lg border border-border-strong bg-elevated px-3 py-2 text-sm text-hi focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
          />
          {state?.errors?.endAt && <p className="text-xs text-red-400">{state.errors.endAt[0]}</p>}
        </div>
      </div>

      {/* Attendee emails */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-hi">Participantes</label>

        {/* Chips — customer email (locked) + extras */}
        {allEmails.length > 0 && (
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-canvas px-3 py-2 min-h-[38px]">
            {customerEmail && (
              <span className="flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                {customerEmail}
              </span>
            )}
            {extraEmails.map((email) => (
              <span key={email} className="flex items-center gap-1 rounded-full bg-elevated px-2.5 py-0.5 text-xs font-medium text-hi">
                {email}
                <button
                  type="button"
                  onClick={() => removeExtraEmail(email)}
                  className="ml-0.5 text-lo hover:text-hi"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input for extra emails */}
        <div className="flex gap-2">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={handleEmailKeyDown}
            placeholder="Adicionar outro participante..."
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
          />
          <button
            type="button"
            onClick={addEmail}
            className="rounded-lg border border-border px-3 py-2 text-sm text-md hover:bg-elevated"
          >
            Adicionar
          </button>
        </div>
        <p className="text-xs text-lo">
          O e-mail do cliente é adicionado automaticamente. Pressione Enter ou vírgula para incluir outros.
        </p>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-hi">Descrição</label>
        <textarea
          name="description"
          rows={3}
          placeholder="Pauta, objetivos ou informações adicionais..."
          className="rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={pending || !customerId}
          className="flex items-center gap-2 rounded-lg btn-brand px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
        >
          {pending ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Agendando...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Agendar Reunião
            </>
          )}
        </button>
        <a href="/meetings" className="flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-md hover:bg-elevated">
          Cancelar
        </a>
      </div>
    </form>
  )
}
