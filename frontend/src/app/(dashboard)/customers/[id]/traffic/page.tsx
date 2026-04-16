import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import {
  Customer,
  Campaign,
  MetaAdAccount,
  PaginatedResponse,
  TrafficCampaignStatus,
  CampaignPublishStatus,
  TrafficCampaignObjective,
} from '@/lib/definitions'

export const metadata = { title: 'Tráfego Pago — WB Customer' }

type Props = {
  params: Promise<{ id: string }>
}

const OBJECTIVE_LABEL: Record<TrafficCampaignObjective, string> = {
  CONVERSIONS: 'Conversões',
  LINK_CLICKS: 'Tráfego',
  REACH: 'Alcance',
  BRAND_AWARENESS: 'Reconhecimento',
  LEAD_GENERATION: 'Geração de Leads',
  VIDEO_VIEWS: 'Views',
  POST_ENGAGEMENT: 'Engajamento',
}

const STATUS_BADGE: Record<TrafficCampaignStatus, { label: string; cls: string }> = {
  active: { label: 'Ativo', cls: 'bg-green-500/10 text-green-400' },
  paused: { label: 'Pausado', cls: 'bg-amber-500/10 text-amber-400' },
  archived: { label: 'Arquivado', cls: 'bg-canvas text-lo' },
}

const PUBLISH_BADGE: Record<CampaignPublishStatus, { label: string; cls: string }> = {
  draft: { label: 'Rascunho', cls: 'bg-canvas text-lo' },
  ready_to_publish: { label: 'Pronto', cls: 'bg-sky-500/10 text-sky-400' },
  publishing: { label: 'Publicando', cls: 'bg-amber-500/10 text-amber-400' },
  published: { label: 'Publicado', cls: 'bg-green-500/10 text-green-400' },
  publish_failed: { label: 'Erro', cls: 'bg-red-500/10 text-red-400' },
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default async function TrafficPage({ params }: Props) {
  const { id } = await params

  let customer: Customer
  try {
    customer = await apiServer.get<Customer>(`/api/v1/customers/${id}`)
  } catch {
    notFound()
  }

  let campaigns: Campaign[] = []
  try {
    const res = await apiServer.get<PaginatedResponse<Campaign>>(
      `/api/v1/customers/${id}/campaigns?limit=50`,
    )
    campaigns = res.items
  } catch {
    // empty state
  }

  let metaAccount: MetaAdAccount | null = null
  try {
    metaAccount = await apiServer.get<MetaAdAccount>(`/api/v1/customers/${id}/meta-account`)
  } catch {
    // not configured
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/customers/${id}`}
            className="flex items-center gap-1.5 text-sm text-md transition-colors hover:text-hi"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {customer.name}
          </Link>
          <span className="text-lo">/</span>
          <span className="text-sm font-medium text-hi">Tráfego Pago</span>
          {campaigns.length > 0 && (
            <span className="rounded-full bg-elevated px-2 py-0.5 text-xs text-md">{campaigns.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/customers/${id}/traffic/meta-config`}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-hi transition-colors hover:bg-elevated"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            Conta Meta
          </Link>
          <Link
            href={`/customers/${id}/traffic/campaigns/new`}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova Campanha
          </Link>
        </div>
      </div>

      {/* Meta account warning */}
      {!metaAccount && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-sm text-amber-300">
            Conta Meta não configurada.{' '}
            <Link href={`/customers/${id}/traffic/meta-config`} className="underline hover:text-amber-200">
              Configurar agora
            </Link>
          </p>
        </div>
      )}

      {/* KPI summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Gasto Total', value: BRL.format(0) },
          { label: 'Impressões', value: '0' },
          { label: 'Cliques', value: '0' },
          { label: 'Conversões', value: '0' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-lo">{kpi.label}</p>
            <p className="mt-1 text-lg font-semibold text-hi">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Campaigns table */}
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-16 gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lo">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <p className="text-sm text-lo">Nenhuma campanha criada ainda.</p>
          <Link
            href={`/customers/${id}/traffic/campaigns/new`}
            className="text-sm text-accent hover:underline"
          >
            Criar a primeira campanha
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-lo">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-lo">Objetivo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-lo">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-lo">Publicação</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-lo">Orçamento Diário</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-lo">Criado em</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-lo">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map(campaign => {
                const statusInfo = STATUS_BADGE[campaign.status] ?? STATUS_BADGE.archived
                const publishInfo = PUBLISH_BADGE[campaign.publishStatus] ?? PUBLISH_BADGE.draft
                return (
                  <tr key={campaign.id} className="hover:bg-elevated/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-hi">{campaign.name}</td>
                    <td className="px-4 py-3 text-md">
                      {OBJECTIVE_LABEL[campaign.objective] ?? campaign.objective}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${publishInfo.cls}`}>
                        {publishInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-md">
                      {campaign.dailyBudget != null ? BRL.format(campaign.dailyBudget) : '—'}
                    </td>
                    <td className="px-4 py-3 text-md">
                      {new Date(campaign.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/customers/${id}/traffic/campaigns/${campaign.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-hi transition-colors hover:bg-elevated"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Ver
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
