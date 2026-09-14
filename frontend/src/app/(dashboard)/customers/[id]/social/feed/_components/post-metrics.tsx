'use client'

import { useState, useTransition } from 'react'
import { PostMetrics as Metrics } from '@/lib/definitions'
import { getPostMetrics } from '@/app/actions/social'
import { useToast } from '@/components/toast/toast-context'
import LoadingDots from '@/components/ui/loading-dots'

interface Props {
  customerId: string
  postId: string
}

export default function PostMetricsPanel({ customerId, postId }: Props) {
  const { error: toastError } = useToast()
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<Metrics | null>(null)

  function load() {
    startTransition(async () => {
      const res = await getPostMetrics(customerId, postId)
      if (res.message) {
        toastError(res.message)
        return
      }
      setData(res.metrics ?? { available: false, metrics: [] })
    })
  }

  if (!data) {
    return (
      <button
        type="button"
        onClick={load}
        disabled={isPending}
        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-md transition-colors hover:bg-elevated hover:text-hi disabled:opacity-50"
      >
        {isPending ? <LoadingDots /> : 'Ver resultado'}
      </button>
    )
  }

  if (!data.available) {
    return (
      <p className="text-xs text-lo">
        A rede não informa resultado para este post. Sem dado não é o mesmo que zero.
      </p>
    )
  }

  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2">
      {data.metrics.map((m) => (
        <div key={m.label}>
          <dt className="text-xs uppercase tracking-wide text-lo">{m.label}</dt>
          <dd className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold text-hi tabular-nums">
              {m.total.toLocaleString('pt-BR')}
            </span>
            {m.percentageChange !== 0 && (
              <span
                className={`text-xs tabular-nums ${
                  m.percentageChange > 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {m.percentageChange > 0 ? '+' : ''}
                {m.percentageChange}%
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
