'use client'

import { useState, useTransition } from 'react'
import { MetaAdAccount } from '@/lib/definitions'
import { saveMetaAdAccount } from '@/app/actions/campaigns'
import { useToast } from '@/components/toast/toast-context'

interface Props {
  customerId: string
  existing: MetaAdAccount | null
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  )
}

export default function MetaConfigForm({ customerId, existing }: Props) {
  const { success, error: toastError } = useToast()
  const [isPending, startTransition] = useTransition()

  const [adAccountId, setAdAccountId] = useState(existing?.adAccountId ?? '')
  const [pageId, setPageId] = useState(existing?.pageId ?? '')
  const [pixelId, setPixelId] = useState(existing?.pixelId ?? '')
  const [instagramActorId, setInstagramActorId] = useState(existing?.instagramActorId ?? '')
  const [accountName, setAccountName] = useState(existing?.accountName ?? '')

  const inputCls = 'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-60'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await saveMetaAdAccount(customerId, {
        adAccountId,
        pageId: pageId || undefined,
        pixelId: pixelId || undefined,
        instagramActorId: instagramActorId || undefined,
        accountName: accountName || undefined,
      })
      if (res.message) {
        toastError(res.message)
      } else {
        success('Conta Meta configurada com sucesso.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold text-hi">Configurar Conta Meta Ads</h2>
        <p className="mt-1 text-xs text-lo">
          Conecte a conta de anúncios do Meta para publicar campanhas diretamente.
        </p>
      </div>

      {existing && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-xs text-green-400">Conta configurada. Atualize os campos se necessário.</p>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-lo mb-1">
          Ad Account ID *{' '}
          <span className="text-lo font-normal">(ex: act_123456789)</span>
        </label>
        <input
          value={adAccountId}
          onChange={e => setAdAccountId(e.target.value)}
          placeholder="act_XXXXXXXXXX"
          required
          disabled={isPending}
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-lo mb-1">Account Name (opcional)</label>
        <input
          value={accountName}
          onChange={e => setAccountName(e.target.value)}
          placeholder="Nome da conta de anúncios"
          disabled={isPending}
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-lo mb-1">Page ID (opcional)</label>
        <input
          value={pageId}
          onChange={e => setPageId(e.target.value)}
          placeholder="ID da página do Facebook"
          disabled={isPending}
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-lo mb-1">Pixel ID (opcional)</label>
        <input
          value={pixelId}
          onChange={e => setPixelId(e.target.value)}
          placeholder="ID do Pixel do Meta"
          disabled={isPending}
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-lo mb-1">Instagram Actor ID (opcional)</label>
        <input
          value={instagramActorId}
          onChange={e => setInstagramActorId(e.target.value)}
          placeholder="ID da conta do Instagram"
          disabled={isPending}
          className={inputCls}
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending || !adAccountId.trim()}
          className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending && <Spinner />}
          {isPending ? 'Salvando...' : existing ? 'Atualizar' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
