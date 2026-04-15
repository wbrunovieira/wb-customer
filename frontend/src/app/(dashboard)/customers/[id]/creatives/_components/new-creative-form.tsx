'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCreative } from '@/app/actions/creatives'
import { useToast } from '@/components/toast/toast-context'

const TYPES = [
  { value: 'image', label: 'Imagem' },
  { value: 'video', label: 'Vídeo' },
  { value: 'carousel', label: 'Carrossel' },
]

const OBJECTIVES = [
  { value: 'awareness', label: 'Reconhecimento' },
  { value: 'traffic', label: 'Tráfego' },
  { value: 'engagement', label: 'Engajamento' },
  { value: 'leads', label: 'Leads' },
  { value: 'sales', label: 'Vendas' },
  { value: 'retargeting', label: 'Retargeting' },
]

interface Props {
  customerId: string
}

export default function NewCreativeForm({ customerId }: Props) {
  const router = useRouter()
  const { success, error } = useToast()
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    const title = data.get('title') as string
    const type = data.get('type') as string
    const caption = (data.get('caption') as string) || undefined
    const textInCreative = (data.get('textInCreative') as string) || undefined
    const designDescription = (data.get('designDescription') as string) || undefined
    const objective = (data.get('objective') as string) || undefined

    if (!title || !type) return

    startTransition(async () => {
      const result = await createCreative(customerId, { title, type, caption, textInCreative, designDescription, objective })

      if (result.message) {
        error(result.message)
        return
      }

      success('Criativo criado com sucesso.')
      form.reset()
      router.push(`/customers/${customerId}/creatives`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-hi">Novo Criativo</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Título *</label>
          <input
            name="title"
            required
            placeholder="ex: Anúncio de Lançamento"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Tipo *</label>
          <select
            name="type"
            required
            defaultValue=""
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="" disabled>Selecione</option>
            {TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Objetivo</label>
          <select
            name="objective"
            defaultValue=""
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
            placeholder="Texto do anúncio (legenda do post)"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Texto no criativo</label>
          <input
            name="textInCreative"
            placeholder="ex: DESCONTO 30% • Aproveite agora"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <p className="mt-1 text-xs text-lo">Headline ou CTA sobreposto visualmente no criativo</p>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-lo mb-1">Descrição do design</label>
          <textarea
            name="designDescription"
            rows={2}
            placeholder="ex: Fundo branco, produto centralizado"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.push(`/customers/${customerId}/creatives`)}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-md hover:bg-elevated transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Criando...' : 'Criar Criativo'}
        </button>
      </div>
    </form>
  )
}
