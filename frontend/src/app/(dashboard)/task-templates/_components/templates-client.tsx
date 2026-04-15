'use client'

import { useState, useTransition, useActionState } from 'react'
import { TaskTemplate, TemplateTaskData, Customer } from '@/lib/definitions'
import { createTemplate, applyTemplate, deleteTemplate } from '@/app/actions/templates'

// ─── Create form ──────────────────────────────────────────────

function CreateTemplateForm({ onCreated }: { onCreated: () => void }) {
  const [tasks, setTasks] = useState<TemplateTaskData[]>([{ title: '' }])
  const [state, formAction, pending] = useActionState(createTemplate, undefined)
  const errors = (state as { errors?: Record<string, string[]> } | undefined)?.errors

  function addTask() {
    setTasks((prev) => [...prev, { title: '' }])
  }

  function removeTask(i: number) {
    setTasks((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateTask(i: number, field: keyof TemplateTaskData, value: string) {
    setTasks((prev) =>
      prev.map((t, idx) =>
        idx === i
          ? {
              ...t,
              [field]:
                field === 'estimatedHours' || field === 'impact' || field === 'confidence' || field === 'effort'
                  ? value === '' ? null : Number(value)
                  : value,
            }
          : t,
      ),
    )
  }

  if ((state as { success?: boolean } | undefined)?.success) {
    onCreated()
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-medium text-slate-700">Nome do template *</label>
        <input
          name="name"
          type="text"
          placeholder="Ex: Processo de Release"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {errors?.name && <p className="mt-1 text-xs text-red-600">{errors.name[0]}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-slate-700">Tarefas *</label>
          <button
            type="button"
            onClick={addTask}
            className="text-xs text-indigo-600 hover:underline"
          >
            + Adicionar
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {tasks.map((task, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="flex-1 flex flex-col gap-1.5">
                <input
                  type="text"
                  value={task.title}
                  onChange={(e) => updateTask(i, 'title', e.target.value)}
                  placeholder={`Tarefa ${i + 1}`}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={task.estimatedHours ?? ''}
                    onChange={(e) => updateTask(i, 'estimatedHours', e.target.value)}
                    placeholder="Horas est."
                    min={0}
                    className="w-24 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none"
                  />
                  <input
                    type="number"
                    value={task.impact ?? ''}
                    onChange={(e) => updateTask(i, 'impact', e.target.value)}
                    placeholder="Impacto"
                    min={1} max={10}
                    className="w-20 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>
              {tasks.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTask(i)}
                  className="mt-1 text-slate-300 hover:text-red-400"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {errors?.tasks && <p className="mt-1 text-xs text-red-600">{errors.tasks[0]}</p>}
      </div>

      {/* Pass tasks as JSON hidden field */}
      <input type="hidden" name="tasks" value={JSON.stringify(tasks.filter((t) => t.title.trim()))} />

      {(state as { message?: string } | undefined)?.message && (
        <p className="text-xs text-red-600">{(state as { message: string }).message}</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? 'Criando...' : 'Criar Template'}
        </button>
      </div>
    </form>
  )
}

// ─── Apply modal ──────────────────────────────────────────────

function ApplyModal({
  template,
  customers,
  onClose,
}: {
  template: TaskTemplate
  customers: Customer[]
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [result, setResult] = useState<{ taskIds?: string[]; message?: string } | null>(null)

  function handleApply() {
    if (!customerId) return
    startTransition(async () => {
      const r = await applyTemplate(template.id, customerId)
      setResult(r as { taskIds?: string[]; message?: string })
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">Aplicar "{template.name}"</h3>
        <p className="mt-1 text-xs text-slate-500">
          Serão criadas {template.tasks.length} tarefa(s) no cliente selecionado.
        </p>

        {result?.taskIds ? (
          <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            ✅ {result.taskIds.length} tarefa(s) criada(s) com sucesso!
          </div>
        ) : (
          <div className="mt-4">
            <label className="text-xs font-medium text-slate-700">Cliente</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {result?.message && <p className="mt-1 text-xs text-red-600">{result.message}</p>}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            {result?.taskIds ? 'Fechar' : 'Cancelar'}
          </button>
          {!result?.taskIds && (
            <button
              onClick={handleApply}
              disabled={pending || !customerId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {pending ? 'Aplicando...' : 'Aplicar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main client component ────────────────────────────────────

export default function TemplatesClient({
  initialTemplates,
  customers,
}: {
  initialTemplates: TaskTemplate[]
  customers: Customer[]
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [applyTarget, setApplyTarget] = useState<TaskTemplate | null>(null)
  const [pending, startTransition] = useTransition()
  const [templates, setTemplates] = useState(initialTemplates)

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteTemplate(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Create form */}
      {showCreate ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Novo Template</h3>
            <button
              onClick={() => setShowCreate(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancelar
            </button>
          </div>
          <CreateTemplateForm onCreated={() => setShowCreate(false)} />
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Template
          </button>
        </div>
      )}

      {/* Templates list */}
      {templates.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white gap-2">
          <p className="text-sm text-slate-400">Nenhum template criado ainda.</p>
          <button onClick={() => setShowCreate(true)} className="text-xs text-indigo-600 hover:underline">
            Criar primeiro template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{t.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{t.tasks.length} tarefa(s)</p>
                </div>
                <button
                  onClick={() => handleDelete(t.id)}
                  disabled={pending}
                  className="text-slate-300 hover:text-red-400 disabled:opacity-50 text-sm"
                  title="Excluir template"
                >
                  ×
                </button>
              </div>

              {/* Task list preview */}
              <ul className="mt-3 flex flex-col gap-1">
                {t.tasks.slice(0, 4).map((task, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="h-1 w-1 rounded-full bg-slate-300 shrink-0" />
                    <span className="truncate">{task.title}</span>
                  </li>
                ))}
                {t.tasks.length > 4 && (
                  <li className="text-xs text-slate-400">+{t.tasks.length - 4} mais...</li>
                )}
              </ul>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                </span>
                <button
                  onClick={() => setApplyTarget(t)}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  Aplicar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply modal */}
      {applyTarget && (
        <ApplyModal
          template={applyTarget}
          customers={customers}
          onClose={() => setApplyTarget(null)}
        />
      )}
    </div>
  )
}
