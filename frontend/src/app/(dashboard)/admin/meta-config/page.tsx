import Link from 'next/link'
import { getAdminMetaConfig, listBmAdAccounts } from '@/app/actions/campaigns'
import AdminMetaConfigForm from './_components/admin-meta-config-form'

export const metadata = { title: 'Meta Config — WB Customer' }

export default async function AdminMetaConfigPage() {
  const [existing, bmAccounts] = await Promise.all([
    getAdminMetaConfig(),
    // Only attempt to list accounts if config exists (avoids error noise)
    getAdminMetaConfig().then((cfg) => (cfg ? listBmAdAccounts() : [])),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link
              href="/traffic"
              className="flex items-center gap-1.5 text-sm text-lo transition-colors hover:text-hi"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Tráfego Pago
            </Link>
            <span className="text-lo text-sm">/</span>
            <span className="text-sm font-medium text-hi">Meta Config</span>
          </div>
          <p className="text-xs text-lo mt-0.5">
            Credenciais do Business Manager e System User para integração com o Meta Ads.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <AdminMetaConfigForm existing={existing} bmAccounts={bmAccounts} />
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-lo">Como configurar</h3>
        <ol className="flex flex-col gap-2 text-xs text-lo list-decimal list-inside">
          <li>Crie um <strong className="text-md">System User</strong> no Business Manager com permissão de anúncios.</li>
          <li>Gere um <strong className="text-md">token permanente</strong> para esse System User com os escopos: <span className="font-mono text-md">ads_management, ads_read, business_management</span>.</li>
          <li>Insira o <strong className="text-md">App ID</strong> e <strong className="text-md">App Secret</strong> do seu app Meta.</li>
          <li>Após salvar, as contas de anúncios vinculadas ao BM serão listadas automaticamente.</li>
        </ol>
      </div>
    </div>
  )
}
