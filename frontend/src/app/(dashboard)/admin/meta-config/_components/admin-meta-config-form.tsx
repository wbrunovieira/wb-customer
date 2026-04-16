'use client'

import { useState, useTransition } from 'react'
import { MetaConfigInfo, MetaBmAdAccount, saveAdminMetaConfig } from '@/app/actions/campaigns'
import { useToast } from '@/components/toast/toast-context'
import LoadingDots from '@/components/ui/loading-dots'

interface Props {
  existing: MetaConfigInfo | null
  bmAccounts: MetaBmAdAccount[]
}

export default function AdminMetaConfigForm({ existing, bmAccounts }: Props) {
  const { success, error: toastError } = useToast()
  const [isPending, startTransition] = useTransition()

  const [appId, setAppId] = useState(existing?.appId ?? '')
  const [appSecret, setAppSecret] = useState('')
  const [systemUserToken, setSystemUserToken] = useState('')
  const [bmId, setBmId] = useState(existing?.bmId ?? '')
  const [ownAdAccountId, setOwnAdAccountId] = useState(existing?.ownAdAccountId ?? '')

  const selectedAccount = bmAccounts.find((a) => a.id === ownAdAccountId)

  const inputCls = 'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi placeholder:text-lo focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-60 font-mono'
  const selectCls = 'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-60'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await saveAdminMetaConfig({
        appId,
        appSecret: appSecret || (existing ? '(unchanged)' : ''),
        systemUserToken: systemUserToken || (existing ? '(unchanged)' : ''),
        bmId,
        ownAdAccountId: ownAdAccountId || null,
        ownAdAccountName: selectedAccount?.name ?? null,
      })
      if (res.message) {
        toastError(res.message)
      } else {
        success('Configuração Meta salva com sucesso.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {existing && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-xs text-green-400">
            Configuração ativa. Deixe os campos de credenciais em branco para manter os valores existentes.
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-lo mb-1">App ID *</label>
          <input
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            placeholder="123456789"
            required
            disabled={isPending}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-lo mb-1">Business Manager ID *</label>
          <input
            value={bmId}
            onChange={(e) => setBmId(e.target.value)}
            placeholder="987654321"
            required
            disabled={isPending}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-lo mb-1">
          App Secret {existing && <span className="text-lo font-normal">(deixe em branco para manter)</span>}
        </label>
        <input
          value={appSecret}
          onChange={(e) => setAppSecret(e.target.value)}
          type="password"
          placeholder={existing ? '••••••••••••' : 'abc123secret'}
          required={!existing}
          disabled={isPending}
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-lo mb-1">
          System User Token {existing && <span className="text-lo font-normal">(deixe em branco para manter)</span>}
        </label>
        <input
          value={systemUserToken}
          onChange={(e) => setSystemUserToken(e.target.value)}
          type="password"
          placeholder={existing ? '••••••••••••' : 'EAAxxxxxxx...'}
          required={!existing}
          disabled={isPending}
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-lo mb-1">
          Minha Conta de Anúncios{' '}
          <span className="text-lo font-normal">(opcional — conta principal do BM)</span>
        </label>
        {bmAccounts.length > 0 ? (
          <>
            <select
              value={ownAdAccountId ?? ''}
              onChange={(e) => setOwnAdAccountId(e.target.value)}
              disabled={isPending}
              className={selectCls}
            >
              <option value="">Nenhuma selecionada</option>
              {bmAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} — {account.id}
                </option>
              ))}
            </select>
            {ownAdAccountId && (
              <p className="mt-1 text-xs text-lo font-mono">{ownAdAccountId}</p>
            )}
          </>
        ) : (
          <input
            value={ownAdAccountId ?? ''}
            onChange={(e) => setOwnAdAccountId(e.target.value)}
            placeholder="act_XXXXXXXXXX"
            disabled={isPending}
            className={inputCls}
          />
        )}
        {bmAccounts.length === 0 && (
          <p className="mt-1 text-xs text-lo">
            Salve as credenciais acima primeiro para listar as contas disponíveis no BM.
          </p>
        )}
      </div>

      <div className="flex justify-end pt-2 border-t border-border">
        <button
          type="submit"
          disabled={isPending || !appId.trim() || !bmId.trim()}
          className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending && <LoadingDots />}
          {isPending ? 'Salvando...' : existing ? 'Atualizar configuração' : 'Salvar configuração'}
        </button>
      </div>
    </form>
  )
}
