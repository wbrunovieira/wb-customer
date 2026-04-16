'use client'

import { useState, useTransition } from 'react'
import { MetaAdAccount } from '@/lib/definitions'
import { MetaBmAdAccount, saveMetaAdAccount } from '@/app/actions/campaigns'
import { useToast } from '@/components/toast/toast-context'
import LoadingDots from '@/components/ui/loading-dots'

interface Props {
  customerId: string
  existing: MetaAdAccount | null
  bmAccounts: MetaBmAdAccount[]
}

export default function MetaConfigForm({ customerId, existing, bmAccounts }: Props) {
  const { success, error: toastError } = useToast()
  const [isPending, startTransition] = useTransition()

  const [selectedAccountId, setSelectedAccountId] = useState(existing?.adAccountId ?? '')
  const [pageId, setPageId] = useState(existing?.pageId ?? '')
  const [pixelId, setPixelId] = useState(existing?.pixelId ?? '')
  const [instagramActorId, setInstagramActorId] = useState(existing?.instagramActorId ?? '')

  const hasBmAccounts = bmAccounts.length > 0
  const selectedAccount = bmAccounts.find((a) => a.id === selectedAccountId)

  const inputCls = 'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-60'
  const selectCls = 'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-60'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const accountName = selectedAccount?.name ?? undefined
      const res = await saveMetaAdAccount(customerId, {
        adAccountId: selectedAccountId,
        pageId: pageId || undefined,
        pixelId: pixelId || undefined,
        instagramActorId: instagramActorId || undefined,
        accountName: accountName ?? (existing?.accountName || undefined),
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

      {/* Ad Account selector */}
      <div>
        <label className="block text-xs font-medium text-lo mb-1">
          Ad Account *
        </label>
        {hasBmAccounts ? (
          <>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              required
              disabled={isPending}
              className={selectCls}
            >
              <option value="">Selecione uma conta de anúncios...</option>
              {bmAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} — {account.id}
                </option>
              ))}
            </select>
            {selectedAccountId && (
              <p className="mt-1 text-xs text-lo font-mono">{selectedAccountId}</p>
            )}
          </>
        ) : (
          <input
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            placeholder="act_XXXXXXXXXX"
            required
            disabled={isPending}
            className={inputCls}
          />
        )}
        {!hasBmAccounts && (
          <p className="mt-1 text-xs text-lo">
            Configure o Business Manager em{' '}
            <a href="/admin/meta-config" className="text-accent hover:underline">
              Admin → Meta Config
            </a>{' '}
            para listar as contas disponíveis.
          </p>
        )}
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
          disabled={isPending || !selectedAccountId.trim()}
          className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending && <LoadingDots />}
          {isPending ? 'Salvando...' : existing ? 'Atualizar' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
