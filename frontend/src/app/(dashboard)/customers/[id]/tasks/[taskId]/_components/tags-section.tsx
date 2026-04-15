'use client'

import { useTransition, useState } from 'react'
import { attachTag, detachTag, createTag } from '@/app/actions/tasks'
import { TaskTag } from '@/lib/definitions'

type Props = {
  customerId: string
  taskId: string
  attachedTags: TaskTag[]
  allTags: TaskTag[]
}

const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b',
]

export default function TagsSection({ customerId, taskId, attachedTags, allTags }: Props) {
  const [pending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0])
  const [creating, setCreating] = useState(false)

  const attachedIds = new Set(attachedTags.map((t) => t.id))
  const unattached = allTags.filter((t) => !attachedIds.has(t.id))

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const result = await createTag(customerId, newName.trim(), newColor)
      await attachTag(customerId, taskId, result.tagId)
      setNewName('')
      setNewColor(TAG_COLORS[0])
      setShowCreate(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-hi mb-2">Tags</h3>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {attachedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              disabled={pending}
              onClick={() => startTransition(() => detachTag(customerId, taskId, tag.id))}
              className="ml-0.5 opacity-70 hover:opacity-100 disabled:opacity-30"
              aria-label={`Remover tag ${tag.name}`}
            >
              ×
            </button>
          </span>
        ))}
        {attachedTags.length === 0 && (
          <span className="text-xs text-lo">Nenhuma tag.</span>
        )}
      </div>

      {unattached.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {unattached.map((tag) => (
            <button
              key={tag.id}
              disabled={pending}
              onClick={() => startTransition(() => attachTag(customerId, taskId, tag.id))}
              className="inline-flex items-center rounded-full border border-dashed px-2.5 py-0.5 text-xs font-medium text-md hover:border-border-strong disabled:opacity-40"
            >
              + {tag.name}
            </button>
          ))}
        </div>
      )}

      {showCreate ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da tag"
            className="w-full rounded border border-border px-2 py-1 text-sm focus:border-brand/60 focus:outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`h-5 w-5 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : ''}`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="rounded-lg btn-brand px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              {creating ? '...' : 'Criar e adicionar'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-xs text-lo hover:text-md"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="text-xs text-indigo-600 hover:underline"
        >
          + Nova tag
        </button>
      )}
    </div>
  )
}
