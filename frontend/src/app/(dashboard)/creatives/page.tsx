import Link from 'next/link'
import { apiServer } from '@/lib/api-server'
import { CustomerListItem, Creative, PaginatedResponse } from '@/lib/definitions'

export const metadata = { title: 'Criativos — WB Customer' }

function getThumbUrl(c: Creative): string | null {
  if (c.thumbnailUrl) return c.thumbnailUrl
  if (c.driveFileId) return `https://drive.google.com/thumbnail?id=${c.driveFileId}&sz=w400-h300`
  return null
}

interface CustomerCreatives {
  customer: CustomerListItem
  creatives: Creative[]
  total: number
}

export default async function CreativesPage() {
  // 1. fetch all active customers
  let customers: CustomerListItem[] = []
  try {
    const res = await apiServer.get<PaginatedResponse<CustomerListItem>>(
      '/api/v1/customers?status=active&limit=200',
    )
    customers = res.items
  } catch {
    // empty
  }

  // 2. fetch creatives for each customer in parallel (latest 8 for preview)
  const groups: CustomerCreatives[] = await Promise.all(
    customers.map(async (customer) => {
      try {
        const res = await apiServer.get<PaginatedResponse<Creative>>(
          `/api/v1/customers/${customer.id}/creatives?limit=8`,
        )
        return { customer, creatives: res.items, total: res.total }
      } catch {
        return { customer, creatives: [], total: 0 }
      }
    }),
  )

  // 3. only show customers that have creatives
  const withCreatives = groups.filter(g => g.total > 0)
  const withoutCreatives = groups.filter(g => g.total === 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-hi">Criativos</h1>
          <p className="text-xs text-lo mt-0.5">
            {withCreatives.length} cliente{withCreatives.length !== 1 ? 's' : ''} com criativos
            {withoutCreatives.length > 0 && ` · ${withoutCreatives.length} sem criativos`}
          </p>
        </div>
      </div>

      {withCreatives.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-16 gap-3">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lo">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="text-sm text-lo">Nenhum criativo cadastrado.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {withCreatives.map(({ customer, creatives, total }) => (
            <section key={customer.id}>
              {/* Customer header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/customers/${customer.id}/creatives`}
                    className="text-sm font-semibold text-hi hover:text-accent transition-colors"
                  >
                    {customer.name}
                  </Link>
                  <span className="rounded-full bg-elevated px-2 py-0.5 text-xs text-lo">{total}</span>
                </div>
                <Link
                  href={`/customers/${customer.id}/creatives`}
                  className="text-xs text-lo hover:text-accent transition-colors"
                >
                  Ver todos →
                </Link>
              </div>

              {/* Creatives grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                {creatives.map(creative => {
                  const thumb = getThumbUrl(creative)
                  return (
                    <Link
                      key={creative.id}
                      href={`/customers/${customer.id}/creatives/${creative.id}`}
                      className="group relative flex flex-col rounded-lg border border-border bg-surface overflow-hidden hover:border-accent/40 transition-colors"
                    >
                      {/* Thumbnail */}
                      <div className="relative h-24 bg-elevated flex items-center justify-center overflow-hidden">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt={creative.title}
                            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-lo">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        )}
                        {/* Stage dot */}
                        {creative.stage && (
                          <div className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${
                            creative.stage === 'exploration' ? 'bg-sky-400' :
                            creative.stage === 'refinement' ? 'bg-violet-400' : 'bg-green-400'
                          }`} title={creative.stage} />
                        )}
                      </div>

                      {/* Title */}
                      <div className="px-2 py-1.5">
                        <p className="text-xs text-hi line-clamp-1 leading-tight">{creative.title}</p>
                      </div>
                    </Link>
                  )
                })}

                {/* "Ver mais" card if there are more */}
                {total > creatives.length && (
                  <Link
                    href={`/customers/${customer.id}/creatives`}
                    className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface h-full min-h-[7rem] text-lo hover:text-accent hover:border-accent/40 transition-colors gap-1"
                  >
                    <span className="text-lg font-semibold">+{total - creatives.length}</span>
                    <span className="text-xs">ver mais</span>
                  </Link>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
