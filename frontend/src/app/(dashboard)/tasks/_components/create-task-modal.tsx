'use client'

import { useActionState, useState, useRef, useEffect } from 'react'
import { createTask } from '@/app/actions/tasks'
import { CustomerListItem } from '@/lib/definitions'

type Props = {
  customers: CustomerListItem[]
}

export default function CreateTaskModal({ customers }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null)
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Reset when modal closes
  function handleClose() {
    setOpen(false)
    setSelectedCustomer(null)
    setSearch('')
    setShowDropdown(false)
  }

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = search.trim()
    ? customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : customers.slice(0, 8)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shrink-0"
      >
        + Nova tarefa
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleClose}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Nova tarefa</h2>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="p-5">
              {selectedCustomer ? (
                <TaskForm
                  customer={selectedCustomer}
                  onBack={() => setSelectedCustomer(null)}
                  onSuccess={handleClose}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-slate-600">
                    Selecione o cliente para a nova tarefa:
                  </p>

                  {/* Search input */}
                  <div className="relative">
                    <input
                      ref={searchRef}
                      type="text"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setShowDropdown(true)
                      }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Buscar cliente..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    {showDropdown && filtered.length > 0 && (
                      <div
                        ref={dropdownRef}
                        className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
                      >
                        {filtered.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(c)
                              setShowDropdown(false)
                              setSearch('')
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                          >
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                              {c.name.slice(0, 2).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 truncate">{c.name}</p>
                              <p className="text-xs text-slate-400 truncate">{c.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {showDropdown && search.trim() && filtered.length === 0 && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-lg">
                        <p className="text-sm text-slate-400">Nenhum cliente encontrado.</p>
                      </div>
                    )}
                  </div>

                  {/* Quick list when not searching */}
                  {!search.trim() && (
                    <div className="flex flex-col divide-y divide-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                      {customers.slice(0, 6).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCustomer(c)}
                          className="flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
                        >
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                            {c.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                            <p className="text-xs text-slate-400 truncate">{c.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Task form (after customer is selected) ────────────────────

function TaskForm({
  customer,
  onBack,
  onSuccess,
}: {
  customer: CustomerListItem
  onBack: () => void
  onSuccess: () => void
}) {
  const action = createTask.bind(null, customer.id)
  const [state, formAction, pending] = useActionState(action, undefined)
  const errors = (state as { errors?: { title?: string[] } } | undefined)?.errors
  const message = (state as { message?: string } | undefined)?.message
  const success = (state as { success?: boolean } | undefined)?.success

  useEffect(() => {
    if (success) onSuccess()
  }, [success, onSuccess])

  return (
    <div className="flex flex-col gap-3">
      {/* Selected customer badge */}
      <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-200 text-xs font-semibold text-indigo-800">
            {customer.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-sm font-medium text-indigo-900">{customer.name}</span>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-indigo-500 hover:text-indigo-700 underline"
        >
          Trocar
        </button>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        {message && <p className="text-xs text-red-600">{message}</p>}

        <div>
          <input
            name="title"
            placeholder="Título da tarefa"
            required
            autoFocus
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors?.title && <p className="mt-0.5 text-xs text-red-600">{errors.title[0]}</p>}
        </div>

        <textarea
          name="description"
          rows={2}
          placeholder="Descrição (opcional)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
        />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-500">Status</label>
            <select
              name="status"
              defaultValue="backlog"
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            >
              <option value="idea_could">Ideia (could)</option>
              <option value="idea_should">Ideia (should)</option>
              <option value="backlog">Backlog</option>
              <option value="todo">A fazer</option>
              <option value="in_progress">Em andamento</option>
              <option value="review">Revisão</option>
              <option value="done">Concluído</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Horas estimadas</label>
            <input
              name="estimatedHours"
              type="number"
              min="0"
              step="0.5"
              placeholder="—"
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-500">Início (opcional)</label>
            <input
              name="startAt"
              type="date"
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Prazo (opcional)</label>
            <input
              name="endAt"
              type="date"
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-slate-500">Impacto</label>
            <input
              name="impact"
              type="number"
              min="1"
              max="10"
              placeholder="—"
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Confiança</label>
            <input
              name="confidence"
              type="number"
              min="1"
              max="10"
              placeholder="—"
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Esforço</label>
            <input
              name="effort"
              type="number"
              min="1"
              max="10"
              placeholder="—"
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? 'Criando...' : 'Criar tarefa'}
          </button>
        </div>
      </form>
    </div>
  )
}
