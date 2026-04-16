import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import {
  Customer,
  CampaignDashboard,
  TrafficCampaignStatus,
  CampaignPublishStatus,
  TrafficCampaignObjective,
} from '@/lib/definitions'
import CampaignActions from '../../_components/campaign-actions'

export const metadata = { title: 'Campanha — WB Customer' }

type Props = {
  params: Promise<{ id: string; campaignId: string }>
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

function fmt(n: number | null, prefix?: string): string {
  if (n == null) return '—'
  if (prefix === 'R$') return BRL.format(n)
  if (prefix === '%') return `${(n * 100).toFixed(2)}%`
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export default async function CampaignDetailPage({ params }: Props) {
  const { id: customerId, campaignId } = await params

  let customer: Customer
  try {
    customer = await apiServer.get<Customer>(`/api/v1/customers/${customerId}`)
  } catch {
    notFound()
  }

  let dashboard: CampaignDashboard | null = null
  try {
    dashboard = await apiServer.get<CampaignDashboard>(
      `/api/v1/customers/${customerId}/campaigns/${campaignId}/dashboard`,
    )
  } catch {
    // try simple campaign fetch
  }

  if (!dashboard) {
    notFound()
  }

  const { campaign, totals, adSetBreakdown } = dashboard
  const statusInfo = STATUS_BADGE[campaign.status] ?? STATUS_BADGE.archived
  const publishInfo = PUBLISH_BADGE[campaign.publishStatus] ?? PUBLISH_BADGE.draft

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-sm text-md">
            <Link href={`/customers/${customerId}`} className="hover:text-hi transition-colors">
              {customer.name}
            </Link>
            <span className="text-lo">/</span>
            <Link href={`/customers/${customerId}/traffic`} className="hover:text-hi transition-colors">
              Tráfego Pago
            </Link>
            <span className="text-lo">/</span>
            <span className="text-hi font-medium">{campaign.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-hi">{campaign.name}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${publishInfo.cls}`}>
              {publishInfo.label}
            </span>
            <span className="rounded-full bg-elevated px-2 py-0.5 text-xs text-md">
              {OBJECTIVE_LABEL[campaign.objective] ?? campaign.objective}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/customers/${customerId}/traffic/campaigns/${campaignId}/edit`}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-hi transition-colors hover:bg-elevated"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editar
          </Link>
          <CampaignActions
            customerId={customerId}
            campaignId={campaignId}
            publishStatus={campaign.publishStatus}
            status={campaign.status}
          />
        </div>
      </div>

      {/* Publish error banner */}
      {campaign.publishError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-red-300">{campaign.publishError}</p>
        </div>
      )}

      {/* KPI totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[
          { label: 'Gasto', value: fmt(totals.spent, 'R$') },
          { label: 'Impressões', value: totals.impressions.toLocaleString('pt-BR') },
          { label: 'Cliques', value: totals.clicks.toLocaleString('pt-BR') },
          { label: 'Conversões', value: totals.conversions.toLocaleString('pt-BR') },
          { label: 'CTR', value: fmt(totals.ctr, '%') },
          { label: 'CPC', value: fmt(totals.cpc, 'R$') },
          { label: 'ROAS', value: fmt(totals.roas) },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-lo">{kpi.label}</p>
            <p className="mt-1 text-base font-semibold text-hi">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Ad sets breakdown */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-hi">Ad Sets</h2>

        {adSetBreakdown.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-10 gap-2">
            <p className="text-sm text-lo">Nenhum ad set encontrado.</p>
          </div>
        ) : (
          adSetBreakdown.map(({ adSet, ads }) => (
            <div key={adSet.id} className="rounded-xl border border-border bg-surface overflow-hidden">
              {/* Ad set header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-hi">{adSet.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PUBLISH_BADGE[adSet.publishStatus]?.cls ?? ''}`}>
                    {PUBLISH_BADGE[adSet.publishStatus]?.label ?? adSet.publishStatus}
                  </span>
                </div>
                {adSet.dailyBudget != null && (
                  <span className="text-xs text-md">{BRL.format(adSet.dailyBudget)}/dia</span>
                )}
              </div>

              {/* Ads */}
              {ads.length === 0 ? (
                <div className="px-4 py-6 text-sm text-lo text-center">Sem anúncios</div>
              ) : (
                <div className="divide-y divide-border">
                  {ads.map(({ ad, creative, totals: adTotals }) => {
                    const thumb = creative?.thumbnailUrl ?? (creative?.driveFileId
                      ? `https://drive.google.com/thumbnail?id=${creative.driveFileId}&sz=w100-h80`
                      : null)
                    const hasMetrics = adTotals.impressions > 0 || adTotals.clicks > 0
                    return (
                      <div key={ad.id} className="flex items-center gap-3 px-4 py-3">
                        {/* Creative thumbnail */}
                        <div className="shrink-0 h-12 w-12 rounded-lg border border-border bg-elevated overflow-hidden flex items-center justify-center">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt={creative?.title ?? ''} className="h-full w-full object-cover" />
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lo">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          )}
                        </div>

                        {/* Ad info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-hi truncate">{ad.name}</span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PUBLISH_BADGE[ad.publishStatus]?.cls ?? ''}`}>
                              {PUBLISH_BADGE[ad.publishStatus]?.label ?? ad.publishStatus}
                            </span>
                          </div>
                          {creative && (
                            <p className="text-xs text-lo truncate">{creative.title}</p>
                          )}
                        </div>

                        {/* Metrics */}
                        <div className="shrink-0 flex items-center gap-4 text-right">
                          {hasMetrics ? (
                            <>
                              <div>
                                <p className="text-xs text-lo">Impressões</p>
                                <p className="text-sm font-medium text-hi">{adTotals.impressions.toLocaleString('pt-BR')}</p>
                              </div>
                              <div>
                                <p className="text-xs text-lo">Cliques</p>
                                <p className="text-sm font-medium text-hi">{adTotals.clicks.toLocaleString('pt-BR')}</p>
                              </div>
                              <div>
                                <p className="text-xs text-lo">CTR</p>
                                <p className="text-sm font-medium text-hi">{fmt(adTotals.ctr, '%')}</p>
                              </div>
                              <div>
                                <p className="text-xs text-lo">Gasto</p>
                                <p className="text-sm font-medium text-hi">{fmt(adTotals.spent, 'R$')}</p>
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-lo">Sem métricas ainda</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
