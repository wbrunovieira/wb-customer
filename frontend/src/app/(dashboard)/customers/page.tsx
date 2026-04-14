import Link from 'next/link'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { CustomerListItem, PaginatedResponse } from '@/lib/definitions'
import SearchBar from './_components/search-bar'
import DeleteButton from './_components/delete-button'

export const metadata = { title: 'Clientes — WB Customer' }

const STATUS_LABEL: Record<string, string> = {
  lead: 'Lead',
  active: 'Ativo',
  inactive: 'Inativo',
}

const STATUS_CLASS: Record<string, string> = {
  lead: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  active: 'bg-green-50 text-green-700 ring-green-600/20',
  inactive: 'bg-slate-50 text-slate-600 ring-slate-500/20',
}

const LIMIT = 20

type Props = {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}

async function CustomersList({ search, status, page }: { search: string; status: string; page: number }) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  params.set('page', String(page))
  params.set('limit', String(LIMIT))

  let data: PaginatedResponse<CustomerListItem>
  try {
    data = await apiServer.get<PaginatedResponse<CustomerListItem>>(
      `/api/v1/customers?${params.toString()}`,
    )
  } catch {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
        Erro ao carregar clientes. Verifique se o backend está acessível.
      </div>
    )
  }

  if (data.items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-sm text-slate-500">Nenhum cliente encontrado.</p>
      </div>
    )
  }

  const totalPages = Math.ceil(data.total / LIMIT)

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">E-mail</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Telefone</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Criado em</th>
              <th className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.items.map((customer) => (
              <tr key={customer.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <Link href={`/customers/${customer.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {customer.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{customer.email}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{customer.phone ?? '—'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[customer.status] ?? ''}`}>
                    {STATUS_LABEL[customer.status] ?? customer.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {new Date(customer.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      Ver
                    </Link>
                    <Link
                      href={`/customers/${customer.id}/edit`}
                      className="rounded-lg px-3 py-1.5 text-sm text-indigo-600 transition-colors hover:bg-indigo-50"
                    >
                      Editar
                    </Link>
                    <DeleteButton id={customer.id} name={customer.name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination current={page} total={totalPages} search={search} status={status} />
      )}

      <p className="text-xs text-slate-400">
        {data.total} cliente{data.total !== 1 ? 's' : ''} encontrado{data.total !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

function Pagination({ current, total, search, status }: { current: number; total: number; search: string; status: string }) {
  const buildHref = (page: number) => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (status) p.set('status', status)
    p.set('page', String(page))
    return `/customers?${p.toString()}`
  }

  return (
    <div className="flex items-center justify-between">
      <Link
        href={buildHref(current - 1)}
        aria-disabled={current <= 1}
        className={`rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50 ${current <= 1 ? 'pointer-events-none opacity-40' : 'text-slate-700'}`}
      >
        Anterior
      </Link>
      <span className="text-sm text-slate-500">
        Página {current} de {total}
      </span>
      <Link
        href={buildHref(current + 1)}
        aria-disabled={current >= total}
        className={`rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50 ${current >= total ? 'pointer-events-none opacity-40' : 'text-slate-700'}`}
      >
        Próxima
      </Link>
    </div>
  )
}

export default async function CustomersPage({ searchParams }: Props) {
  const { search = '', status = '', page: pageStr = '1' } = await searchParams
  const page = Math.max(1, parseInt(pageStr, 10) || 1)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">Gerencie os clientes da sua empresa</p>
        </div>
        <Link
          href="/customers/new"
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo cliente
        </Link>
      </div>

      <SearchBar defaultValue={search} defaultStatus={status} />

      <Suspense fallback={<div className="text-sm text-slate-500">Carregando...</div>}>
        <CustomersList search={search} status={status} page={page} />
      </Suspense>
    </div>
  )
}
