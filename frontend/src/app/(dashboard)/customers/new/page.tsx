import { Suspense } from 'react'
import Link from 'next/link'
import CustomerForm from '../_components/customer-form'

export const metadata = { title: 'Novo Cliente — WB Customer' }

export default function NewCustomerPage() {
  return (
    <div className="flex flex-col gap-6">
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

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Novo cliente</h1>
        <p className="mt-1 text-sm text-md">Preencha os dados para cadastrar um novo cliente</p>
      </div>

      <div className="max-w-2xl">
        <Suspense>
          <CustomerForm />
        </Suspense>
      </div>
    </div>
  )
}
