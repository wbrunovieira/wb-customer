'use client'

import { useTransition } from 'react'
import { Creative, CreativeStatus } from '@/lib/definitions'
import { updateCreative } from '@/app/actions/creatives'
import { useToast } from '@/components/toast/toast-context'

const OBJECTIVES = [
  { value: 'awareness', label: 'Reconhecimento' },
  { value: 'traffic', label: 'Tráfego' },
  { value: 'engagement', label: 'Engajamento' },
  { value: 'leads', label: 'Leads' },
  { value: 'sales', label: 'Vendas' },
  { value: 'retargeting', label: 'Retargeting' },
]

const STATUSES: { value: CreativeStatus; label: string }[] = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'active', label: 'Ativo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'archived', label: 'Arquivado' },
]

interface Props {
  creative: Creative
}

export default function UpdateCreativeForm({ creative }: Props) {
  const { success, error } = useToast()
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    startTransition(async () => {
      const result = await updateCreative(creative.customerId, creative.id, {
        title: data.get('title') as string,
        status: data.get('status') as string,
        caption: (data.get('caption') as string) || null,
        designDescription: (data.get('designDescription') as string) || null,
        objective: (data.get('objective') as string) || null,
      })

      if (result.message) {
        error(result.message)
      } else {
        success('Criativo atualizado.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Título</label>
          <input
            name="title"
            required
            defaultValue={creative.title}
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Status</label>
          <select
            name="status"
            defaultValue={creative.status}
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Objetivo</label>
          <select
            name="objective"
            defaultValue={creative.objective ?? ''}
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="">Nenhum</option>
            {OBJECTIVES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Caption</label>
          <textarea
            name="caption"
            rows={2}
            defaultValue={creative.caption ?? ''}
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Descrição do design</label>
          <textarea
            name="designDescription"
            rows={2}
            defaultValue={creative.designDescription ?? ''}
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
