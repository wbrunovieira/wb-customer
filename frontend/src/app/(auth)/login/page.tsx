import LoginForm from './login-form'

export const metadata = { title: 'Login — WB Customer' }

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl btn-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-hi">
          WB Customer
        </h1>
        <p className="mt-1 text-sm text-md">
          Entre com suas credenciais para continuar
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <LoginForm />
      </div>
    </div>
  )
}
