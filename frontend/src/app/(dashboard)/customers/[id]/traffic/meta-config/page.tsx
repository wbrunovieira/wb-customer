import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { Customer, MetaAdAccount } from '@/lib/definitions'
import { listBmAdAccounts } from '@/app/actions/campaigns'
import MetaConfigForm from './_components/meta-config-form'
import Link from 'next/link'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const customer = await apiServer.get<Customer>(`/api/v1/customers/${id}`).catch(() => null)
  return { title: `${customer?.name ?? 'Cliente'} — Conta Meta` }
}

export default async function MetaConfigPage({ params }: Props) {
  const { id } = await params

  const [customer, metaAccount, bmAccounts] = await Promise.all([
    apiServer.get<Customer>(`/api/v1/customers/${id}`).catch(() => null),
    apiServer.get<MetaAdAccount>(`/api/v1/customers/${id}/meta-account`).catch(() => null),
    listBmAdAccounts(),
  ])

  if (!customer) notFound()

  return (
    <div className="mx-auto max-w-xl flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/customers/${id}`}
          className="text-md transition-colors hover:text-hi"
        >
          {customer.name}
        </Link>
        <span className="text-lo">/</span>
        <Link
          href={`/customers/${id}/traffic`}
          className="text-md transition-colors hover:text-hi"
        >
          Tráfego Pago
        </Link>
        <span className="text-lo">/</span>
        <span className="font-medium text-hi">Conta Meta</span>
      </div>

      {/* Customer context badge */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent font-semibold text-sm">
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-xs text-lo">Configurando para</p>
          <p className="text-sm font-semibold text-hi">{customer.name}</p>
        </div>
      </div>

      <MetaConfigForm customerId={id} existing={metaAccount} bmAccounts={bmAccounts} />
    </div>
  )
}
