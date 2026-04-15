'use client'

import { useState, useTransition } from 'react'
import { addCreativePerformance } from '@/app/actions/creatives'
import { useToast } from '@/components/toast/toast-context'

const PLATFORMS = ['facebook', 'instagram', 'google', 'tiktok', 'youtube', 'linkedin', 'outros']

interface Props {
  customerId: string
  creativeId: string
}

export default function AddPerformanceForm({ customerId, creativeId }: Props) {
  const { success, error } = useToast()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    const toNum = (key: string) => {
      const v = data.get(key) as string
      return v ? Number(v) : undefined
    }

    startTransition(async () => {
      const result = await addCreativePerformance(customerId, creativeId, {
        platform: data.get('platform') as string,
        campaignId: (data.get('campaignId') as string) || undefined,
        impressions: Number(data.get('impressions')),
        clicks: Number(data.get('clicks')),
        conversions: Number(data.get('conversions')),
        spend: Number(data.get('spend')),
        ctr: toNum('ctr'),
        cpc: toNum('cpc'),
        cpa: toNum('cpa'),
        roas: toNum('roas'),
        startDate: data.get('startDate') as string,
        endDate: (data.get('endDate') as string) || undefined,
        notes: (data.get('notes') as string) || undefined,
      })

      if (result.message) {
        error(result.message)
        return
      }

      success('Performance registrada.')
      setOpen(false)
      form.reset()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Registrar Performance
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-hi">Nova Performance</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-lo hover:text-hi">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-lo mb-1">Plataforma *</label>
          <select
            name="platform"
            required
            defaultValue=""
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="" disabled>Selecione</option>
            {PLATFORMS.map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">ID Campanha</label>
          <input name="campaignId" placeholder="camp-123" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Data início *</label>
          <input name="startDate" type="date" required className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Data fim</label>
          <input name="endDate" type="date" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Impressões *</label>
          <input name="impressions" type="number" min="0" required placeholder="10000" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Cliques *</label>
          <input name="clicks" type="number" min="0" required placeholder="320" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Conversões *</label>
          <input name="conversions" type="number" min="0" required placeholder="15" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">Investimento (R$) *</label>
          <input name="spend" type="number" min="0" step="0.01" required placeholder="250.00" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">CTR (%)</label>
          <input name="ctr" type="number" step="0.01" placeholder="3.2" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">CPC (R$)</label>
          <input name="cpc" type="number" step="0.01" placeholder="0.78" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">CPA (R$)</label>
          <input name="cpa" type="number" step="0.01" placeholder="16.67" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        <div>
          <label className="block text-xs font-medium text-lo mb-1">ROAS</label>
          <input name="roas" type="number" step="0.01" placeholder="4.5" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>

        <div className="col-span-2 sm:col-span-3">
          <label className="block text-xs font-medium text-lo mb-1">Notas</label>
          <textarea name="notes" rows={2} className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none" />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : 'Salvar Performance'}
        </button>
      </div>
    </form>
  )
}
