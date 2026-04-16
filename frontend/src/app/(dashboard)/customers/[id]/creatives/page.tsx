import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { Customer, Creative, PaginatedResponse } from '@/lib/definitions'
import NewCreativeForm from './_components/new-creative-form'
import CreativeCard from './_components/creative-card'

export const metadata = { title: 'Criativos — WB Customer' }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string; status?: string; newCreative?: string }>
}

export default async function CreativesPage({ params, searchParams }: Props) {
  const { id } = await params
  const { type, status, newCreative } = await searchParams

  let customer: Customer
  try {
    customer = await apiServer.get<Customer>(`/api/v1/customers/${id}`)
  } catch {
    notFound()
  }

  const query = new URLSearchParams()
  if (type) query.set('type', type)
  if (status) query.set('status', status)
  query.set('limit', '100')

  let creatives: Creative[] = []
  let total = 0
  try {
    const res = await apiServer.get<PaginatedResponse<Creative>>(
      `/api/v1/customers/${id}/creatives?${query}`,
    )
    creatives = res.items
    total = res.total
  } catch {
    // empty state
  }

  const typeFilters = [
    { value: '', label: 'Todos' },
    { value: 'image', label: 'Imagem' },
    { value: 'video', label: 'Vídeo' },
    { value: 'carousel', label: 'Carrossel' },
  ]

  const statusFilters = [
    { value: '', label: 'Todos' },
    { value: 'draft', label: 'Rascunho' },
    { value: 'active', label: 'Ativo' },
    { value: 'paused', label: 'Pausado' },
    { value: 'archived', label: 'Arquivado' },
  ]

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
          <span className="text-sm font-medium text-hi">Criativos</span>
          {total > 0 && (
            <span className="rounded-full bg-elevated px-2 py-0.5 text-xs text-md">{total}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/customers/${id}/creatives/strategies`}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-hi transition-colors hover:bg-elevated"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Estratégias
          </Link>
<Link
            href={`?newCreative=1`}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Criativo
          </Link>
        </div>
      </div>

      {/* New Creative Form */}
      {newCreative === '1' && (
        <NewCreativeForm customerId={id} creatives={creatives} />
      )}

{/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="text-xs text-lo mr-1">Tipo:</span>
          {typeFilters.map(f => {
            const params = new URLSearchParams()
            if (f.value) params.set('type', f.value)
            if (status) params.set('status', status)
            const isActive = (type ?? '') === f.value
            return (
              <Link
                key={f.value}
                href={`?${params}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'bg-elevated text-md hover:text-hi'
                }`}
              >
                {f.label}
              </Link>
            )
          })}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-lo mr-1">Status:</span>
          {statusFilters.map(f => {
            const params = new URLSearchParams()
            if (type) params.set('type', type)
            if (f.value) params.set('status', f.value)
            const isActive = (status ?? '') === f.value
            return (
              <Link
                key={f.value}
                href={`?${params}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'bg-elevated text-md hover:text-hi'
                }`}
              >
                {f.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      {creatives.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-16 gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lo">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="text-sm text-lo">Nenhum criativo encontrado.</p>
          <Link
            href="?newCreative=1"
            className="text-sm text-accent hover:underline"
          >
            Criar o primeiro criativo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {creatives.map(creative => (
            <CreativeCard key={creative.id} creative={creative} customerId={id} />
          ))}
        </div>
      )}
    </div>
  )
}
