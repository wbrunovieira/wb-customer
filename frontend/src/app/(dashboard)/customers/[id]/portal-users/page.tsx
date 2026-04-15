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

  const subTabs = [
    { href: `/customers/${id}/documents`, label: 'Documentos' },
    { href: `/customers/${id}/meetings`, label: 'Reuniões' },
    { href: `/customers/${id}/portal-users`, label: 'Portal' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-md">
            <Link href="/customers" className="hover:text-hi">Clientes</Link>
            <span>/</span>
            <Link href={`/customers/${id}`} className="hover:text-hi">{customer!.name}</Link>
            <span>/</span>
            <span className="text-hi">Portal</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Portal — {customer!.name}
          </h1>
          <p className="mt-1 text-sm text-md">
            Usuários com acesso ao portal do cliente.
          </p>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex gap-1 border-b border-border">
        {subTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab.label === 'Portal'
                ? 'border-b-2 border-brand text-white'
                : 'text-md hover:text-hi'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <AdminPortalUsersManager customerId={id} initialUsers={users} />
    </div>
  )
}
