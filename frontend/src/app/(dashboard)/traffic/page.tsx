import Link from 'next/link'
import { apiServer } from '@/lib/api-server'
import {
  CustomerListItem,
  Campaign,
  MetaAdAccount,
  PaginatedResponse,
  CampaignPublishStatus,
  TrafficCampaignStatus,
} from '@/lib/definitions'
import { getAdminMetaConfig, MetaConfigInfo } from '@/app/actions/campaigns'

export const metadata = { title: 'Tráfego Pago — WB Customer' }

const STATUS_DOT: Record<TrafficCampaignStatus, string> = {
  active: 'bg-green-400',
  paused: 'bg-amber-400',
  archived: 'bg-zinc-500',
}

const PUBLISH_BADGE: Record<CampaignPublishStatus, { label: string; cls: string }> = {
  draft: { label: 'Rascunho', cls: 'bg-canvas text-lo' },
  ready_to_publish: { label: 'Pronto', cls: 'bg-sky-500/10 text-sky-400' },
  publishing: { label: 'Publicando', cls: 'bg-amber-500/10 text-amber-400' },
  published: { label: 'Publicado', cls: 'bg-green-500/10 text-green-400' },
  publish_failed: { label: 'Erro', cls: 'bg-red-500/10 text-red-400' },
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

interface CustomerTrafficEntry {
  customer: CustomerListItem
  metaAccount: MetaAdAccount | null
  campaigns: Campaign[]
}

export default async function GlobalTrafficPage() {
  // 1. Admin meta config
  const adminConfig: MetaConfigInfo | null = await getAdminMetaConfig()

  // 2. All active customers
  let customers: CustomerListItem[] = []
  try {
    const res = await apiServer.get<PaginatedResponse<CustomerListItem>>(
      '/api/v1/customers?status=active&limit=200',
    )
    customers = res.items
  } catch {
    // empty
  }

  // 3. For each customer, fetch their meta account and campaigns in parallel
  const entries: CustomerTrafficEntry[] = await Promise.all(
    customers.map(async (customer) => {
      const [metaAccount, campaigns] = await Promise.all([
        apiServer
          .get<MetaAdAccount>(`/api/v1/customers/${customer.id}/meta-account`)
          .catch(() => null),
        apiServer
          .get<PaginatedResponse<Campaign>>(`/api/v1/customers/${customer.id}/campaigns?limit=50`)
          .then((r) => r.items)
          .catch(() => [] as Campaign[]),
      ])
      return { customer, metaAccount, campaigns }
    }),
  )

  // Separate customers with and without campaigns / meta account
  const withTraffic = entries.filter((e) => e.campaigns.length > 0 || e.metaAccount)
  const withoutTraffic = entries.filter((e) => e.campaigns.length === 0 && !e.metaAccount)

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-hi">Tráfego Pago</h1>
          <p className="mt-0.5 text-sm text-lo">
            Visão geral das campanhas de todos os clientes
          </p>
        </div>
        <Link
          href="/admin/meta-config"
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-hi transition-colors hover:bg-elevated"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
          </svg>
          Configurar Meta
        </Link>
      </div>

      {/* ── Minha Conta ───────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-lo">
          Minha Conta
        </h2>

        {adminConfig ? (
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                    <path d="M22 2L11 13" /><path d="M22 2L15 22 11 13 2 9l20-7z" />
                  </svg>
                  <span className="text-sm font-semibold text-hi">
                    {adminConfig.ownAdAccountName ?? 'Business Manager'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-lo">
                  <span>BM ID: <span className="font-mono text-md">{adminConfig.bmId}</span></span>
                  {adminConfig.ownAdAccountId && (
                    <span>Conta: <span className="font-mono text-md">{adminConfig.ownAdAccountId}</span></span>
                  )}
                </div>
              </div>
              <Link
                href="/admin/meta-config"
                className="shrink-0 rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-hi transition-colors hover:bg-border"
              >
                Editar
              </Link>
            </div>

            {!adminConfig.ownAdAccountId && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <p className="text-xs text-amber-300">
                  Nenhuma conta de anúncios principal configurada.{' '}
                  <Link href="/admin/meta-config" className="underline hover:text-amber-200">
                    Vincular agora
                  </Link>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface p-6 flex flex-col items-center gap-3 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lo">
              <path d="M22 2L11 13" /><path d="M22 2L15 22 11 13 2 9l20-7z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-hi">Integração Meta não configurada</p>
              <p className="mt-0.5 text-xs text-lo">Configure a sua conta do Business Manager para habilitar campanhas.</p>
            </div>
            <Link
              href="/admin/meta-config"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Configurar agora
            </Link>
          </div>
        )}
      </section>

      {/* ── Clientes ──────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-lo">
          Clientes
        </h2>

        {entries.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface py-12 flex flex-col items-center gap-2">
            <p className="text-sm text-lo">Nenhum cliente cadastrado.</p>
            <Link href="/customers" className="text-sm text-accent hover:underline">Gerenciar clientes</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Customers with traffic activity */}
            {withTraffic.map(({ customer, metaAccount, campaigns }) => {
              const activeCampaigns = campaigns.filter((c) => c.status === 'active')
              const totalSpent = 0 // Would need metrics endpoint

              return (
                <div key={customer.id} className="rounded-xl border border-border bg-surface overflow-hidden">
                  {/* Customer header */}
                  <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-elevated text-sm font-semibold text-hi">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-hi">{customer.name}</p>
                        <p className="text-xs text-lo">{customer.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {metaAccount ? (
                        <span className="flex items-center gap-1.5 text-xs text-green-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                          {metaAccount.accountName ?? metaAccount.adAccountId}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          Sem conta Meta
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/customers/${customer.id}/traffic/meta-config`}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-hi transition-colors hover:bg-elevated"
                        >
                          Conta Meta
                        </Link>
                        <Link
                          href={`/customers/${customer.id}/traffic`}
                          className="rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                        >
                          Ver campanhas
                          {campaigns.length > 0 && (
                            <span className="ml-1.5 rounded-full bg-accent/20 px-1.5 text-accent">
                              {campaigns.length}
                            </span>
                          )}
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Campaigns list (up to 3) */}
                  {campaigns.length > 0 ? (
                    <div className="divide-y divide-border">
                      {campaigns.slice(0, 3).map((campaign) => {
                        const publishInfo = PUBLISH_BADGE[campaign.publishStatus] ?? PUBLISH_BADGE.draft
                        const dotCls = STATUS_DOT[campaign.status] ?? STATUS_DOT.archived
                        return (
                          <div key={campaign.id} className="flex items-center justify-between gap-4 px-5 py-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`h-2 w-2 rounded-full shrink-0 ${dotCls}`} />
                              <span className="truncate text-sm text-hi">{campaign.name}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${publishInfo.cls}`}>
                                {publishInfo.label}
                              </span>
                              {campaign.dailyBudget != null && (
                                <span className="text-xs text-lo">{BRL.format(campaign.dailyBudget)}/dia</span>
                              )}
                              <Link
                                href={`/customers/${customer.id}/traffic/campaigns/${campaign.id}`}
                                className="text-xs text-accent hover:underline"
                              >
                                Ver
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                      {campaigns.length > 3 && (
                        <div className="px-5 py-2.5">
                          <Link
                            href={`/customers/${customer.id}/traffic`}
                            className="text-xs text-lo hover:text-hi transition-colors"
                          >
                            +{campaigns.length - 3} campanhas
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-5 py-3 text-xs text-lo">
                      Nenhuma campanha.{' '}
                      <Link
                        href={`/customers/${customer.id}/traffic/campaigns/new`}
                        className="text-accent hover:underline"
                      >
                        Criar agora
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Customers without traffic — collapsed section */}
            {withoutTraffic.length > 0 && (
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-lo list-none hover:text-hi transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-90">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  {withoutTraffic.length} cliente{withoutTraffic.length !== 1 ? 's' : ''} sem campanhas
                </summary>
                <div className="mt-2 flex flex-col gap-2 pl-2">
                  {withoutTraffic.map(({ customer }) => (
                    <div key={customer.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-elevated text-xs font-semibold text-hi">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-hi">{customer.name}</span>
                      </div>
                      <Link
                        href={`/customers/${customer.id}/traffic`}
                        className="text-xs text-accent hover:underline"
                      >
                        Configurar tráfego
                      </Link>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
