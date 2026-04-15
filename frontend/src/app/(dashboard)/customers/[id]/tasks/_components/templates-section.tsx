'use client'

import { useState, useTransition } from 'react'
import { TaskTemplate, Task } from '@/lib/definitions'
import { applyTemplate, createTemplateFromTasks } from '@/app/actions/templates'

type Props = {
  customerId: string
  templates: TaskTemplate[]
  tasks: Task[]
}

export default function TemplatesSection({ customerId, templates, tasks }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [applyResult, setApplyResult] = useState<{ count?: number; message?: string } | null>(null)
  const [creating, setCreating] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [templateName, setTemplateName] = useState('')
  const [createResult, setCreateResult] = useState<{ templateId?: string; message?: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const boardTasks = tasks.filter(
    (t) => t.status !== 'idea_could' && t.status !== 'idea_should' && t.status !== 'cancelled',
  )

  function toggleTask(id: string) {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleApply(templateId: string) {
    setApplyingId(templateId)
    setApplyResult(null)
    startTransition(async () => {
      const r = await applyTemplate(templateId, customerId)
      if ('taskIds' in r && r.taskIds) setApplyResult({ count: r.taskIds.length })
      else if ('message' in r) setApplyResult({ message: r.message as string })
      setApplyingId(null)
    })
  }

  function handleCreateFromTasks() {
    if (!templateName.trim()) return
    if (selectedTaskIds.size === 0) return
    startTransition(async () => {
      const r = await createTemplateFromTasks(templateName.trim(), [...selectedTaskIds])
      setCreateResult(r as { templateId?: string; message?: string })
      if ('templateId' in r) {
        setCreating(false)
        setSelectedTaskIds(new Set())
        setTemplateName('')
      }
    })
  }

  return (
    <div className="rounded-xl border border-border-strong bg-surface p-5 shadow-sm">
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <h3 className="text-sm font-semibold text-hi">
          Templates
          {templates.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-lo">{templates.length}</span>
          )}
        </h3>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-lo transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {!expanded && applyResult?.count && (
        <p className="mt-1 text-xs text-green-400">✅ {applyResult.count} tarefa(s) criada(s)!</p>
      )}

      {expanded && (
        <div className="mt-4 flex flex-col gap-4">
          {/* Templates list */}
          {templates.length === 0 ? (
            <p className="text-xs text-lo">Nenhum template disponível. Crie um em Templates no menu.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-canvas px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium text-hi">{t.name}</span>
                    <span className="ml-2 text-xs text-lo">{t.tasks.length} tarefa(s)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {applyResult?.count && applyingId === null && (
                      <span className="text-xs text-green-400">✅ {applyResult.count} criada(s)</span>
                    )}
                    {applyResult?.message && (
                      <span className="text-xs text-red-400">{applyResult.message}</span>
                    )}
                    <button
                      onClick={() => handleApply(t.id)}
                      disabled={pending}
                      className="rounded-lg btn-brand px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {applyingId === t.id ? 'Aplicando...' : 'Aplicar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create template from current tasks */}
          <div className="border-t border-border pt-4">
            {!creating ? (
              <button
                onClick={() => { setCreating(true); setCreateResult(null) }}
                className="text-xs text-accent hover:underline"
              >
                + Criar template a partir das tarefas atuais
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-hi">Selecione as tarefas para o template:</p>

                <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
                  {boardTasks.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-elevated cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTaskIds.has(t.id)}
                        onChange={() => toggleTask(t.id)}
                        className="rounded border-border text-accent"
                      />
                      <span className="text-xs text-hi truncate">{t.title}</span>
                    </label>
                  ))}
                </div>

                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Nome do template"
                  className="w-full rounded-lg border border-border-strong bg-elevated px-3 py-1.5 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25"
                />

                {createResult?.message && (
                  <p className="text-xs text-red-400">{createResult.message}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleCreateFromTasks}
                    disabled={pending || !templateName.trim() || selectedTaskIds.size === 0}
                    className="rounded-lg btn-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {pending ? 'Criando...' : `Criar (${selectedTaskIds.size} selecionada(s))`}
                  </button>
                  <button
                    onClick={() => { setCreating(false); setSelectedTaskIds(new Set()) }}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-md hover:bg-elevated"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
