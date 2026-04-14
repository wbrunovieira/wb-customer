import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { Customer, PortalUser } from '@/lib/definitions'
import AdminPortalUsersManager from './_components/admin-portal-users-manager'

export const metadata = { title: 'Usuários do Portal — WB Customer' }

export default async function CustomerPortalUsersPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let customer: Customer
  try {
    customer = await apiServer.get<Customer>(`/api/v1/customers/${id}`)
  } catch {
    notFound()
  }

  let users: PortalUser[] = []
  try {
    const res = await apiServer.get<{ users: PortalUser[] }>(`/api/v1/customers/${id}/portal-users`)
    users = res.users
  } catch {
    // show empty
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/customers" className="hover:text-slate-900">Clientes</Link>
            <span>/</span>
            <Link href={`/customers/${id}`} className="hover:text-slate-900">{customer!.name}</Link>
            <span>/</span>
            <span className="text-slate-900">Portal</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Portal — {customer!.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Usuários com acesso ao portal do cliente.
          </p>
        </div>
      </div>

      <AdminPortalUsersManager customerId={id} initialUsers={users} />
    </div>
  )
}
