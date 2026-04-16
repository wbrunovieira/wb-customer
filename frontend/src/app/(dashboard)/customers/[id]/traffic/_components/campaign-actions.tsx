'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  markCampaignReady,
  publishCampaign,
  syncCampaignMetrics,
  archiveCampaign,
  pauseCampaign,
} from '@/app/actions/campaigns'
import { CampaignPublishStatus, TrafficCampaignStatus } from '@/lib/definitions'

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
    >
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  )
}

interface Props {
  customerId: string
  campaignId: string
  publishStatus: CampaignPublishStatus
  status: TrafficCampaignStatus
  onError?: (msg: string) => void
}

export default function CampaignActions({ customerId, campaignId, publishStatus, status, onError }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handle(action: () => Promise<{ message?: string }>) {
    startTransition(async () => {
      const res = await action()
      if (res.message) {
        onError?.(res.message)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {publishStatus === 'draft' && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => handle(() => markCampaignReady(customerId, campaignId))}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-hi transition-colors hover:bg-elevated disabled:opacity-50"
        >
          {isPending ? <Spinner /> : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          Marcar como Pronto
        </button>
      )}

      {publishStatus === 'ready_to_publish' && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => handle(() => publishCampaign(customerId, campaignId))}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? <Spinner /> : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22 11 13 2 9l20-7z" />
            </svg>
          )}
          Publicar no Meta
        </button>
      )}

      {publishStatus === 'published' && (
        <>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handle(() => syncCampaignMetrics(customerId, campaignId))}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-hi transition-colors hover:bg-elevated disabled:opacity-50"
          >
            {isPending ? <Spinner /> : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            )}
            Sincronizar Métricas
          </button>
          {status === 'active' && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handle(() => pauseCampaign(customerId, campaignId))}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-hi transition-colors hover:bg-elevated disabled:opacity-50"
            >
              {isPending ? <Spinner /> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              )}
              Pausar
            </button>
          )}
        </>
      )}

      {status !== 'archived' && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => handle(() => archiveCampaign(customerId, campaignId))}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-lo transition-colors hover:text-hi hover:bg-elevated disabled:opacity-50"
        >
          {isPending ? <Spinner /> : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          )}
          Arquivar
        </button>
      )}
    </div>
  )
}
