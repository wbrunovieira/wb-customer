'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelSocialPost } from '@/app/actions/social'
import { useToast } from '@/components/toast/toast-context'
import LoadingDots from '@/components/ui/loading-dots'

interface Props {
  customerId: string
  postId: string
  /** Quantas redes saem juntas, para o aviso dizer o tamanho do estrago. */
  mirroredCount: number
}

export default function CancelPostButton({ customerId, postId, mirroredCount }: Props) {
  const { success, error: toastError } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  // Confirmação em dois passos: apagar é irreversível e não há desfazer.
  const [confirming, setConfirming] = useState(false)

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelSocialPost(customerId, postId)
      if (res.message) {
        toastError(res.message)
        setConfirming(false)
        return
      }
      success('Post cancelado.')
      router.refresh()
    })
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-md transition-colors hover:border-red-500/40 hover:text-red-400"
      >
        Cancelar
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-red-400">
        {mirroredCount > 1
          ? `Apaga em ${mirroredCount} redes. Não dá para desfazer.`
          : 'Não dá para desfazer.'}
      </span>
      <button
        type="button"
        onClick={handleCancel}
        disabled={isPending}
        className="rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-600/20 transition-colors hover:bg-red-500/20 disabled:opacity-50"
      >
        {isPending ? <LoadingDots /> : 'Confirmar'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="rounded-lg px-2 py-1 text-xs text-lo transition-colors hover:text-hi disabled:opacity-50"
      >
        Voltar
      </button>
    </div>
  )
}
