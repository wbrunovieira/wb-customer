export const metadata = { title: 'Dashboard — WB Customer' }

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Bem-vindo ao WB Customer
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Clientes', value: '—', icon: '🏢' },
          { label: 'Reuniões', value: '—', icon: '📅' },
          { label: 'Documentos', value: '—', icon: '📄' },
          { label: 'Usuários', value: '—', icon: '👥' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
