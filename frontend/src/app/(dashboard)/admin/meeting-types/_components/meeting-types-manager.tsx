'use client'

import { useActionState, useTransition, useState } from 'react'
import { createMeetingType, deleteMeetingType } from '@/app/actions/meetings'
import { MeetingType, MeetingTypeFormState } from '@/lib/definitions'
import { useToast } from '@/components/toast/toast-context'

const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#64748B',
]

type Props = { initialTypes: MeetingType[] }

export default function MeetingTypesManager({ initialTypes }: Props) {
  const { confirm, success, error } = useToast()
  const [createState, createAction, createPending] = useActionState<MeetingTypeFormState, FormData>(
    createMeetingType,
    undefined,
  )
  const [deletePending, startDelete] = useTransition()
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0])
  const [showForm, setShowForm] = useState(false)

  function handleDelete(id: string, name: string) {
    confirm({
      message: `Excluir o tipo "${name}"? Reuniões existentes não serão afetadas.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        startDelete(async () => {
          try {
            await deleteMeetingType(id)
            success(`Tipo "${name}" excluído.`)
          } catch {
            error('Não foi possível excluir o tipo.')
          }
        })
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Existing types */}
      {initialTypes.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border-strong bg-surface shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-canvas">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Duração</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Status</th>
                <th className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initialTypes.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-elevated">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      <div>
                        <p className="text-sm font-medium text-hi">{t.name}</p>
                        {t.description && (
                          <p className="text-xs text-lo">{t.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-md">{t.durationMinutes} min</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      t.isActive
                        ? 'bg-green-500/10 text-green-400 ring-green-600/20'
                        : 'bg-canvas text-md ring-border'
                    }`}>
                      {t.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(t.id, t.name)}
                      disabled={deletePending}
                      className="text-sm text-red-500 hover:underline disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border bg-surface">
          <p className="text-sm text-lo">Nenhum tipo cadastrado ainda.</p>
        </div>
      )}

      {/* Add new */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 self-start rounded-lg border border-border px-4 py-2 text-sm font-medium text-hi hover:bg-elevated"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo tipo
        </button>
      ) : (
        <div className="rounded-xl border border-border-strong bg-surface p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-hi">Novo tipo de reunião</h3>
          <form action={createAction} className="flex flex-col gap-4">
            {createState?.message && (
              <p className="text-sm text-red-400">{createState.message}</p>
            )}
            <input type="hidden" name="color" value={selectedColor} />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-hi">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Ex: Discovery Call"
                  className="rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
                />
                {createState?.errors?.name && (
                  <p className="text-xs text-red-400">{createState.errors.name[0]}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-hi">
                  Duração (min) <span className="text-red-500">*</span>
                </label>
                <input
                  name="durationMinutes"
                  type="number"
                  min="5"
                  max="480"
                  step="5"
                  required
                  defaultValue={60}
                  className="rounded-lg border border-border-strong bg-elevated px-3 py-2 text-sm text-hi focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-hi">Descrição</label>
              <input
                name="description"
                type="text"
                placeholder="Opcional"
                className="rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-hi">Cor</label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`h-7 w-7 rounded-full transition-transform ${
                      selectedColor === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createPending}
                className="rounded-lg btn-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {createPending ? 'Criando...' : 'Criar tipo'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-md hover:bg-elevated"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
