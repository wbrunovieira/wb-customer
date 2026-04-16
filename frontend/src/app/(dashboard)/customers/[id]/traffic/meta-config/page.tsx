import { apiServer } from '@/lib/api-server'
import { MetaAdAccount } from '@/lib/definitions'
import MetaConfigForm from './_components/meta-config-form'
import Link from 'next/link'

export const metadata = { title: 'Configurar Conta Meta — WB Customer' }

type Props = {
  params: Promise<{ id: string }>
}

export default async function MetaConfigPage({ params }: Props) {
  const { id } = await params

  let metaAccount: MetaAdAccount | null = null
  try {
    metaAccount = await apiServer.get<MetaAdAccount>(`/api/v1/customers/${id}/meta-account`)
  } catch {
    // not configured yet
  }

  return (
    <div className="mx-auto max-w-xl flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/customers/${id}/traffic`}
          className="flex items-center gap-1.5 text-sm text-md transition-colors hover:text-hi"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Tráfego Pago
        </Link>
        <span className="text-lo">/</span>
        <span className="text-sm font-medium text-hi">Conta Meta</span>
      </div>

      <MetaConfigForm customerId={id} existing={metaAccount} />
    </div>
  )
}
