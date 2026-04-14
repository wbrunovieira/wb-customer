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
  pending_signature: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  signed: 'bg-green-50 text-green-700 ring-green-600/20',
  expired: 'bg-slate-50 text-slate-500 ring-slate-400/20',
  cancelled: 'bg-red-50 text-red-600 ring-red-500/20',
}

type CustomerWithDocuments = {
  id: string
  name: string
}

type DocumentWithCustomer = Document & { customer?: CustomerWithDocuments }

function formatBytes(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function getAllDocuments() {
  try {
    // Fetch customers then their documents
    const customers = await apiServer.get<PaginatedResponse<{ id: string; name: string }>>(
      '/api/v1/customers?limit=100',
    )

    const results = await Promise.allSettled(
      customers.items.map(async (c) => {
        const docs = await apiServer.get<PaginatedResponse<Document>>(
          `/api/v1/customers/${c.id}/documents?limit=100`,
        )
        return docs.items.map((d) => ({ ...d, customer: { id: c.id, name: c.name } }))
      }),
    )

    const docs: DocumentWithCustomer[] = results.flatMap((r) =>
      r.status === 'fulfilled' ? r.value : [],
    )
    docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return docs
  } catch {
    return []
  }
}

export default async function DocumentsPage() {
  const documents = await getAllDocuments()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Documentos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Todos os documentos — {documents.length} no total
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
          <p className="text-sm text-slate-400">Nenhum documento encontrado.</p>
          <p className="mt-1 text-xs text-slate-400">
            Acesse um cliente para fazer upload de documentos.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Título</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Tamanho</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Data</th>
                <th className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-900">{doc.title}</p>
                    {doc.notes && (
                      <p className="mt-0.5 text-xs text-slate-400 italic truncate max-w-xs">{doc.notes}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {doc.customer ? (
                      <Link
                        href={`/customers/${doc.customer.id}/documents`}
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        {doc.customer.name}
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{TYPE_LABEL[doc.type]}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[doc.status]}`}>
                      {STATUS_LABEL[doc.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatBytes(doc.sizeBytes)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={doc.driveViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        Ver
                      </a>
                      <a
                        href={doc.driveDownloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-slate-600 hover:underline"
                      >
                        Download
                      </a>
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
