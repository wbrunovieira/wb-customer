import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { CustomerDetail } from '@/lib/definitions'
import DeleteButton from '../_components/delete-button'
import { PhoneLink } from '@/components/ui/phone-link'
import { EmailLink } from '@/components/ui/email-link'

export const metadata = { title: 'Cliente — WB Customer' }

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
}

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400 ring-green-600/20',
  inactive: 'bg-canvas text-md ring-border',
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
            className="flex items-center gap-1.5 text-sm text-md transition-colors hover:text-hi"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Clientes
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/customers/${id}/activities`}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-hi transition-colors hover:bg-elevated"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Atividades
          </Link>
          <Link
            href={`/customers/${id}/tasks`}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-hi transition-colors hover:bg-elevated"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Tarefas
          </Link>
          <Link
            href={`/customers/${id}/documents`}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-hi transition-colors hover:bg-elevated"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
            </svg>
            Documentos
          </Link>
          <Link
            href={`/customers/${id}/meetings`}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-hi transition-colors hover:bg-elevated"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Reuniões
          </Link>
          <Link
            href={`/customers/${id}/portal-users`}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-hi transition-colors hover:bg-elevated"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Portal
          </Link>
          <Link
            href={`/customers/${id}/edit`}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-hi transition-colors hover:bg-elevated"
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
          <div className="rounded-xl border border-border-strong bg-surface p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-hi">{customer.name}</h1>
                <p className="mt-1 text-sm text-md">{customer.email}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[customer.status] ?? ''}`}>
                {STATUS_LABEL[customer.status] ?? customer.status}
              </span>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {customer.phone && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-lo">Telefone</dt>
                  <dd className="mt-1 text-sm">
                    <PhoneLink phone={customer.phone} />
                  </dd>
                </div>
              )}
              {customer.document && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-lo">CNPJ</dt>
                  <dd className="mt-1 text-sm text-hi">{customer.document}</dd>
                </div>
              )}
              {customer.website && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-lo">Website</dt>
                  <dd className="mt-1 text-sm text-hi">
                    <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      {customer.website}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-lo">Criado em</dt>
                <dd className="mt-1 text-sm text-hi">
                  {new Date(customer.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </dd>
              </div>
            </dl>

            {customer.notes && (
              <div className="mt-6 border-t border-border pt-6">
                <dt className="text-xs font-medium uppercase tracking-wide text-lo">Observações</dt>
                <dd className="mt-2 text-sm text-hi whitespace-pre-wrap">{customer.notes}</dd>
              </div>
            )}
          </div>

          {/* Contacts */}
          {customer.contacts.length > 0 && (
            <div className="rounded-xl border border-border-strong bg-surface p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-hi">Contatos</h2>
              <ul className="mt-4 flex flex-col divide-y divide-slate-100">
                {customer.contacts.map((contact) => (
                  <li key={contact.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-hi">
                        {contact.name}
                        {contact.isPrimary && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-600/20">
                            Principal
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-md flex flex-wrap items-center gap-x-1">
                        {contact.role && <span>{contact.role}</span>}
                        {contact.role && (contact.email || contact.phone) && <span>·</span>}
                        {contact.email && (
                          <EmailLink email={contact.email} customerId={id} className="text-xs" />
                        )}
                        {contact.email && contact.phone && <span>·</span>}
                        {contact.phone && (
                          <PhoneLink phone={contact.phone} className="text-xs" />
                        )}
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
            <div className="rounded-xl border border-border-strong bg-surface p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-hi">Google Drive</h2>
              <a
                href={customer.driveFolderId}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-2 text-sm text-accent hover:underline"
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

          <div className="rounded-xl border border-border-strong bg-surface p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-hi">Responsáveis</h2>
            {customer.employees.length === 0 ? (
              <p className="mt-3 text-sm text-md">Nenhum responsável atribuído.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {customer.employees.map((e) => (
                  <li key={e.userId} className="text-sm text-hi">
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
