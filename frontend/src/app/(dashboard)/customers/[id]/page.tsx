import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { CustomerDetail } from '@/lib/definitions'
import DeleteButton from '../_components/delete-button'

export const metadata = { title: 'Cliente — WB Customer' }

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
}

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-green-50 text-green-700 ring-green-600/20',
  inactive: 'bg-slate-50 text-slate-600 ring-slate-500/20',
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params

  let customer: CustomerDetail
  try {
    customer = await apiServer.get<CustomerDetail>(`/api/v1/customers/${id}`)
  } catch {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/customers"
            className="flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Clientes
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/customers/${id}/edit`}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editar
          </Link>
          <DeleteButton id={id} name={customer.name} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
                <p className="mt-1 text-sm text-slate-500">{customer.email}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[customer.status] ?? ''}`}>
                {STATUS_LABEL[customer.status] ?? customer.status}
              </span>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {customer.phone && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Telefone</dt>
                  <dd className="mt-1 text-sm text-slate-900">{customer.phone}</dd>
                </div>
              )}
              {customer.document && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">CNPJ</dt>
                  <dd className="mt-1 text-sm text-slate-900">{customer.document}</dd>
                </div>
              )}
              {customer.website && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Website</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                      {customer.website}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Criado em</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {new Date(customer.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </dd>
              </div>
            </dl>

            {customer.notes && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Observações</dt>
                <dd className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{customer.notes}</dd>
              </div>
            )}
          </div>

          {/* Contacts */}
          {customer.contacts.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Contatos</h2>
              <ul className="mt-4 flex flex-col divide-y divide-slate-100">
                {customer.contacts.map((contact) => (
                  <li key={contact.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {contact.name}
                        {contact.isPrimary && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                            Principal
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {[contact.role, contact.email, contact.phone].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="flex flex-col gap-6">
          {customer.driveFolderId && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Google Drive</h2>
              <a
                href={customer.driveFolderId}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-2 text-sm text-indigo-600 hover:underline"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Abrir pasta
              </a>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Responsáveis</h2>
            {customer.employees.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Nenhum responsável atribuído.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {customer.employees.map((e) => (
                  <li key={e.userId} className="text-sm text-slate-700">
                    {e.userId}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
