import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { Creative, CreativePerformance, CreativeType, CreativeStatus } from '@/lib/definitions'
import AddPerformanceForm from './_components/add-performance-form'
import UpdateCreativeForm from './_components/update-creative-form'
import UploadCreativeFile from '../_components/upload-creative-file'

export const metadata = { title: 'Criativo — WB Customer' }

const TYPE_LABEL: Record<CreativeType, string> = {
  image: 'Imagem',
  video: 'Vídeo',
  carousel: 'Carrossel',
}

const TYPE_COLOR: Record<CreativeType, string> = {
  image: 'bg-sky-500/10 text-sky-400 ring-sky-600/20',
  video: 'bg-violet-500/10 text-violet-400 ring-violet-600/20',
  carousel: 'bg-amber-500/10 text-amber-400 ring-amber-600/20',
}

const STATUS_LABEL: Record<CreativeStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  paused: 'Pausado',
  archived: 'Arquivado',
}

const STATUS_COLOR: Record<CreativeStatus, string> = {
  draft: 'bg-canvas text-md ring-border',
  active: 'bg-green-500/10 text-green-400 ring-green-600/20',
  paused: 'bg-amber-500/10 text-amber-400 ring-amber-600/20',
  archived: 'bg-canvas text-lo ring-border',
}

const OBJECTIVE_LABEL: Record<string, string> = {
  awareness: 'Reconhecimento',
  traffic: 'Tráfego',
  engagement: 'Engajamento',
  leads: 'Leads',
  sales: 'Vendas',
  retargeting: 'Retargeting',
}

type Props = {
  params: Promise<{ id: string; creativeId: string }>
}

function fmt(n: number | null | undefined, prefix = '', suffix = '', decimals = 2) {
  if (n == null) return '—'
  return `${prefix}${n.toFixed(decimals)}${suffix}`
}

function fmtInt(n: number) {
  return n.toLocaleString('pt-BR')
}

export default async function CreativeDetailPage({ params }: Props) {
  const { id, creativeId } = await params

  let creative: Creative
  try {
    creative = await apiServer.get<Creative>(`/api/v1/customers/${id}/creatives/${creativeId}`)
  } catch {
    notFound()
  }

  let performances: CreativePerformance[] = []
  try {
    const res = await apiServer.get<{ items: CreativePerformance[] }>(
      `/api/v1/customers/${id}/creatives/${creativeId}/performances`,
    )
    performances = res.items
  } catch {
    // empty
  }

  // Aggregate totals across all performance records
  const totalImpressions = performances.reduce((s, p) => s + p.impressions, 0)
  const totalClicks = performances.reduce((s, p) => s + p.clicks, 0)
  const totalConversions = performances.reduce((s, p) => s + p.conversions, 0)
  const totalSpend = performances.reduce((s, p) => s + p.spend, 0)
  const avgRoas = performances.length > 0
    ? performances.filter(p => p.roas != null).reduce((s, p) => s + (p.roas ?? 0), 0) /
      (performances.filter(p => p.roas != null).length || 1)
    : null

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/customers/${id}`} className="text-md hover:text-hi transition-colors">
          Cliente
        </Link>
        <span className="text-lo">/</span>
        <Link href={`/customers/${id}/creatives`} className="text-md hover:text-hi transition-colors">
          Criativos
        </Link>
        <span className="text-lo">/</span>
        <span className="text-hi font-medium truncate max-w-xs">{creative.title}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: preview + metadata */}
        <div className="flex flex-col gap-4">
          {/* Preview */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="h-56 bg-elevated flex items-center justify-center">
              {creative.thumbnailUrl || (creative.driveViewUrl && creative.mimeType?.startsWith('image')) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={creative.thumbnailUrl ?? creative.driveViewUrl ?? ''}
                  alt={creative.title}
                  className="h-full w-full object-contain"
                />
              ) : creative.driveViewUrl ? (
                <a
                  href={creative.driveViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-3 text-lo hover:text-accent transition-colors"
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  <span className="text-sm">Abrir no Drive</span>
                </a>
              ) : (
                <div className="flex flex-col items-center gap-3 text-lo">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="text-xs">Nenhum arquivo</span>
                </div>
              )}
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TYPE_COLOR[creative.type]}`}>
                  {TYPE_LABEL[creative.type]}
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_COLOR[creative.status]}`}>
                  {STATUS_LABEL[creative.status]}
                </span>
                {creative.objective && (
                  <span className="inline-flex items-center rounded-full bg-elevated px-2.5 py-0.5 text-xs text-md">
                    {OBJECTIVE_LABEL[creative.objective] ?? creative.objective}
                  </span>
                )}
              </div>

              {creative.mimeType && (
                <p className="text-xs text-lo">{creative.mimeType}</p>
              )}

              <div className="flex gap-2">
                <UploadCreativeFile
                  customerId={id}
                  creativeId={creative.id}
                  hasFile={!!creative.driveFileId}
                />
                {creative.driveDownloadUrl && (
                  <a
                    href={creative.driveDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-hi transition-colors hover:bg-elevated"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="rounded-xl border border-border bg-surface p-4 text-xs text-lo flex flex-col gap-1">
            <p>Criado em {new Date(creative.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            <p>Atualizado em {new Date(creative.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        {/* Right: edit form + performance */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Edit */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-sm font-semibold text-hi mb-4">Informações</h2>
            <UpdateCreativeForm creative={creative} />
          </div>

          {/* Aggregate stats */}
          {performances.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Impressões', value: fmtInt(totalImpressions) },
                { label: 'Cliques', value: fmtInt(totalClicks) },
                { label: 'Conversões', value: fmtInt(totalConversions) },
                { label: 'Investimento', value: `R$ ${totalSpend.toFixed(2)}` },
                { label: 'CTR médio', value: totalImpressions > 0 ? `${((totalClicks / totalImpressions) * 100).toFixed(2)}%` : '—' },
                { label: 'CPC médio', value: totalClicks > 0 ? `R$ ${(totalSpend / totalClicks).toFixed(2)}` : '—' },
                { label: 'CPA médio', value: totalConversions > 0 ? `R$ ${(totalSpend / totalConversions).toFixed(2)}` : '—' },
                { label: 'ROAS médio', value: avgRoas != null ? avgRoas.toFixed(2) : '—' },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-xs text-lo">{stat.label}</p>
                  <p className="mt-1 text-lg font-semibold text-hi tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Performance records */}
          <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-hi">
                Histórico de Performance
                {performances.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-lo">({performances.length} registros)</span>
                )}
              </h2>
              <AddPerformanceForm customerId={id} creativeId={creative.id} />
            </div>

            {performances.length === 0 ? (
              <p className="text-sm text-lo">Nenhuma performance registrada ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-lo">
                      <th className="pb-2 text-left font-medium">Plataforma</th>
                      <th className="pb-2 text-right font-medium">Período</th>
                      <th className="pb-2 text-right font-medium">Impressões</th>
                      <th className="pb-2 text-right font-medium">Cliques</th>
                      <th className="pb-2 text-right font-medium">Conv.</th>
                      <th className="pb-2 text-right font-medium">Invest.</th>
                      <th className="pb-2 text-right font-medium">CTR</th>
                      <th className="pb-2 text-right font-medium">ROAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {performances.map(p => (
                      <tr key={p.id} className="text-hi">
                        <td className="py-3 capitalize">{p.platform}</td>
                        <td className="py-3 text-right text-xs text-md">
                          {new Date(p.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          {p.endDate && ` – ${new Date(p.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
                        </td>
                        <td className="py-3 text-right tabular-nums">{fmtInt(p.impressions)}</td>
                        <td className="py-3 text-right tabular-nums">{fmtInt(p.clicks)}</td>
                        <td className="py-3 text-right tabular-nums">{fmtInt(p.conversions)}</td>
                        <td className="py-3 text-right tabular-nums">R$ {p.spend.toFixed(2)}</td>
                        <td className="py-3 text-right tabular-nums">{fmt(p.ctr, '', '%')}</td>
                        <td className="py-3 text-right tabular-nums">{fmt(p.roas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
