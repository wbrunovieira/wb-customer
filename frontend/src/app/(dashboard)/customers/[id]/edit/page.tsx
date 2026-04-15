import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { Customer } from '@/lib/definitions'
import CustomerForm from '../../_components/customer-form'

export const metadata = { title: 'Editar Cliente — WB Customer' }

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditCustomerPage({ params }: Props) {
  const { id } = await params

  let customer: Customer
  try {
    customer = await apiServer.get<Customer>(`/api/v1/customers/${id}`)
  } catch {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/customers/${id}`}
          className="flex items-center gap-1.5 text-sm text-md transition-colors hover:text-hi"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {customer.name}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Editar cliente</h1>
        <p className="mt-1 text-sm text-md">Atualize os dados do cliente</p>
      </div>

      <div className="max-w-2xl">
        <Suspense>
          <CustomerForm customer={customer} />
        </Suspense>
      </div>
    </div>
  )
}
