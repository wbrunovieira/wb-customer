import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { Customer, Document, DocumentStatus, DocumentType, PaginatedResponse } from '@/lib/definitions'
import UploadZone from './_components/upload-zone'
import DocumentStatusSelect from './_components/document-status-select'
import DeleteDocumentButton from './_components/delete-document-button'

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

type Props = {
  params: Promise<{ id: string }>
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function CustomerDocumentsPage({ params }: Props) {
  const { id } = await params

  let customer: Customer
  let data: PaginatedResponse<Document>
  try {
    ;[customer, data] = await Promise.all([
      apiServer.get<Customer>(`/api/v1/customers/${id}`),
      apiServer.get<PaginatedResponse<Document>>(`/api/v1/customers/${id}/documents?limit=50`),
    ])
  } catch {
    notFound()
  }

  const subTabs = [
    { href: `/customers/${id}/documents`, label: 'Documentos' },
    { href: `/customers/${id}/meetings`, label: 'Reuniões' },
    { href: `/customers/${id}/portal-users`, label: 'Portal' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/customers" className="hover:text-slate-900">Clientes</Link>
            <span>/</span>
            <Link href={`/customers/${id}`} className="hover:text-slate-900">{customer!.name}</Link>
            <span>/</span>
            <span className="text-slate-900">Documentos</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Documentos</h1>
          <p className="mt-1 text-sm text-slate-500">{data.total} documento{data.total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {subTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab.label === 'Documentos'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upload */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Enviar documento</h2>
            <Suspense>
              <UploadZone customerId={id} />
            </Suspense>
          </div>
        </div>

        {/* Document list */}
        <div className="lg:col-span-2">
          {data.items.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
              <p className="text-sm text-slate-400">Nenhum documento enviado ainda.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {data.items.map((doc) => (
                <div key={doc.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14,2 14,8 20,8" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{doc.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {TYPE_LABEL[doc.type]} · {formatBytes(doc.sizeBytes)} · {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                        {doc.notes && (
                          <p className="mt-1 text-xs text-slate-400 italic">{doc.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[doc.status]}`}>
                        {STATUS_LABEL[doc.status]}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <DocumentStatusSelect
                      customerId={id}
                      documentId={doc.id}
                      currentStatus={doc.status}
                    />
                    <div className="flex items-center gap-1">
                      <a
                        href={doc.driveViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded px-2 py-1 text-xs text-indigo-600 transition-colors hover:bg-indigo-50"
                      >
                        Visualizar
                      </a>
                      <a
                        href={doc.driveDownloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-100"
                      >
                        Download
                      </a>
                      <DeleteDocumentButton customerId={id} documentId={doc.id} title={doc.title} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
