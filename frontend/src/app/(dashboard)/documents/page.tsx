import Link from 'next/link'
import { apiServer } from '@/lib/api-server'
import { Document, DocumentStatus, DocumentType, PaginatedResponse } from '@/lib/definitions'

export const metadata = { title: 'Documentos — WB Customer' }

const TYPE_LABEL: Record<DocumentType, string> = {
  proposal: 'Proposta',
  contract: 'Contrato',
  addendum: 'Aditivo',
  other: 'Outro',
}

const STATUS_LABEL: Record<DocumentStatus, string> = {
  pending_signature: 'Aguardando assinatura',
  signed: 'Assinado',
  expired: 'Expirado',
  cancelled: 'Cancelado',
}

const STATUS_CLASS: Record<DocumentStatus, string> = {
  pending_signature: 'bg-yellow-500/10 text-yellow-400 ring-yellow-600/20',
  signed: 'bg-green-500/10 text-green-400 ring-green-600/20',
  expired: 'bg-canvas text-md ring-slate-400/20',
  cancelled: 'bg-red-500/10 text-red-400 ring-red-500/20',
}

type CustomerItem = { id: string; name: string; email: string }
type DocumentWithCustomer = Document & { customer: CustomerItem }

function formatBytes(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function DocumentsPage() {
  let customers: CustomerItem[] = []
  let documents: DocumentWithCustomer[] = []

  try {
    const res = await apiServer.get<PaginatedResponse<CustomerItem>>('/api/v1/customers?limit=100')
    customers = res.items

    const results = await Promise.allSettled(
      customers.map(async (c) => {
        const docs = await apiServer.get<PaginatedResponse<Document>>(
          `/api/v1/customers/${c.id}/documents?limit=100`,
        )
        return docs.items.map((d) => ({ ...d, customer: c }))
      }),
    )

    documents = results
      .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch {
    // handled below
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-hi">Documentos</h1>
          <p className="mt-1 text-sm text-md">{documents.length} documento{documents.length !== 1 ? 's' : ''} no total</p>
        </div>
      </div>

      {/* Quick access to upload per customer */}
      {customers.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="mb-3 text-sm font-medium text-hi">Enviar documento para um cliente:</p>
          <div className="flex flex-wrap gap-2">
            {customers.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}/documents`}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-hi transition-colors hover:border-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-400"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                </svg>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Document table */}
      {documents.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface gap-2">
          <p className="text-sm text-lo">Nenhum documento encontrado.</p>
          {customers.length === 0 && (
            <Link href="/customers" className="text-xs text-indigo-600 hover:underline">
              Cadastre um cliente primeiro
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-canvas">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Título</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Tamanho</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Data</th>
                <th className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-canvas">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-hi">{doc.title}</p>
                    {doc.notes && (
                      <p className="mt-0.5 max-w-xs truncate text-xs italic text-lo">{doc.notes}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/customers/${doc.customer.id}/documents`}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      {doc.customer.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-md">{TYPE_LABEL[doc.type]}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[doc.status]}`}>
                      {STATUS_LABEL[doc.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-md">{formatBytes(doc.sizeBytes)}</td>
                  <td className="px-6 py-4 text-sm text-md">
                    {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a href={doc.driveViewUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">Ver</a>
                      <a href={doc.driveDownloadUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-md hover:underline">Download</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
