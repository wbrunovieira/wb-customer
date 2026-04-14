import { apiServer } from '@/lib/api-server'
import { connectGoogle, disconnectGoogle } from '@/app/actions/google'

export const metadata = { title: 'Integração Google — WB Customer' }

type GoogleStatus = { connected: false } | { connected: true; email: string }

export default async function AdminGooglePage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>
}) {
  const { connected: justConnected } = await searchParams

  let status: GoogleStatus = { connected: false }
  try {
    status = await apiServer.get<GoogleStatus>('/api/v1/google/status')
  } catch {
    // not connected or error
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Integração Google</h1>
        <p className="mt-1 text-sm text-slate-500">
          Conecte sua conta Google para habilitar Drive, Agenda e reuniões via Meet.
        </p>
      </div>

      {justConnected && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Conta Google conectada com sucesso!
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          {/* Google icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <svg viewBox="0 0 48 48" width="28" height="28">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          </div>

          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-900">Google Workspace</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Drive para documentos · Calendar para reuniões Meet
            </p>

            {status.connected ? (
              <div className="mt-3 flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Conectado
                </span>
                <span className="text-sm text-slate-600">{status.email}</span>
              </div>
            ) : (
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-400/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  Não conectado
                </span>
              </div>
            )}
          </div>

          <div>
            {status.connected ? (
              <form action={disconnectGoogle}>
                <button
                  type="submit"
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  Desconectar
                </button>
              </form>
            ) : (
              <form action={connectGoogle}>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  Conectar Google
                </button>
              </form>
            )}
          </div>
        </div>

        {status.connected && (
          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Permissões concedidas</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Google Drive', icon: '📁' },
                { label: 'Google Calendar', icon: '📅' },
                { label: 'Google Meet', icon: '🎥' },
              ].map((item) => (
                <span key={item.label} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600">
                  <span>{item.icon}</span>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-800">Conexão única para toda a plataforma</p>
        <p className="mt-1 text-sm text-amber-700">
          O administrador conecta uma vez e todos os documentos e reuniões passam a usar esta conta Google.
          Os arquivos serão salvos em <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">WB-Customer/Documentos/&#123;Nome do Cliente&#125;/</code>
        </p>
      </div>
    </div>
  )
}
