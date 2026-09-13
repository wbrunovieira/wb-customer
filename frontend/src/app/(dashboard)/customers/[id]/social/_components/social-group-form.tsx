'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SocialGroupView } from '@/lib/definitions'
import { linkSocialGroup } from '@/app/actions/social'
import { useToast } from '@/components/toast/toast-context'
import LoadingDots from '@/components/ui/loading-dots'

interface Props {
  customerId: string
  customerName: string
  groups: SocialGroupView[]
  /** Grupo ligado hoje, quando há. */
  currentGroupId: string | null
}

export default function SocialGroupForm({
  customerId,
  customerName,
  groups,
  currentGroupId,
}: Props) {
  const { success, error: toastError } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isUnlinking, startUnlinking] = useTransition()
  const [selected, setSelected] = useState(currentGroupId ?? '')

  const selectCls =
    'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-hi focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-60'

  /** Grupo de outro cliente não entra como opção: o 409 do backend é a rede de
   * segurança, não a primeira linha de defesa. */
  const isTakenByOther = (g: SocialGroupView) =>
    g.linkedCustomerId !== null && g.linkedCustomerId !== customerId

  const available = groups.filter((g) => !isTakenByOther(g))
  const taken = groups.filter(isTakenByOther)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return

    startTransition(async () => {
      const res = await linkSocialGroup(customerId, selected)
      if (res.message) {
        toastError(res.message)
      } else {
        success(`${customerName} publica agora em "${res.groupName}".`)
        router.refresh()
      }
    })
  }

  function handleUnlink() {
    startUnlinking(async () => {
      const res = await linkSocialGroup(customerId, null)
      if (res.message) {
        toastError(res.message)
      } else {
        setSelected('')
        success('Vínculo desfeito.')
        router.refresh()
      }
    })
  }

  const busy = isPending || isUnlinking

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-5"
    >
      <div>
        <h2 className="text-sm font-semibold text-hi">Grupo no motor de publicação</h2>
        <p className="mt-1 text-xs text-lo">
          Define em qual conta os posts deste cliente saem. Um grupo pertence a um
          cliente só.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-md">
          Nenhum grupo no motor ainda. Conecte a conta social no Postiz e nomeie o
          cliente lá — depois disso ele aparece aqui.
        </p>
      ) : (
        <>
          <div>
            <label htmlFor="group" className="block text-xs font-medium text-lo mb-1">
              Grupo *
            </label>
            <select
              id="group"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={busy}
              className={selectCls}
            >
              <option value="">Selecione um grupo...</option>
              {available.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                  {g.channels > 0 ? ` (${g.channels} canal${g.channels > 1 ? 'is' : ''})` : ' (sem canal)'}
                </option>
              ))}
            </select>
          </div>

          {taken.length > 0 && (
            <div className="rounded-lg border border-border bg-canvas px-3 py-2">
              <p className="text-xs font-medium text-lo">Grupos já ocupados</p>
              <ul className="mt-2 flex flex-col gap-1">
                {taken.map((g) => (
                  <li key={g.id} className="text-xs text-md">
                    <span className="text-hi">{g.name}</span> — {g.linkedCustomerName}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy || !selected || selected === currentGroupId}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {isPending ? <LoadingDots /> : currentGroupId ? 'Trocar grupo' : 'Ligar grupo'}
            </button>

            {currentGroupId && (
              <button
                type="button"
                onClick={handleUnlink}
                disabled={busy}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-md transition-colors hover:bg-elevated hover:text-hi disabled:opacity-50"
              >
                {isUnlinking ? <LoadingDots /> : 'Desfazer vínculo'}
              </button>
            )}
          </div>
        </>
      )}
    </form>
  )
}
