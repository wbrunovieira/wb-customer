'use client'

import { useActionState, useTransition, useState } from 'react'
import { createSubUser, CreateSubUserFormState } from '@/app/actions/portal'
import { PortalUser } from '@/lib/definitions'
import { useToast } from '@/components/toast/toast-context'

type Props = { initialUsers: PortalUser[] }

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default function PortalUsersManager({ initialUsers }: Props) {
  const { success, error } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [state, formAction, pending] = useActionState<CreateSubUserFormState, FormData>(
    createSubUser,
    undefined,
  )
  const [, startTransition] = useTransition()

  function handleFormSuccess() {
    if (!state?.message && !state?.errors && !pending) {
      success('Usuário criado com sucesso.')
      setShowForm(false)
    }
  }

  const activeUsers = initialUsers.filter((u) => !u.deletedAt)

  return (
    <div className="flex flex-col gap-4">
      {activeUsers.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-canvas">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Perfil</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-md">Desde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activeUsers.map((u) => (
                <tr key={u.customerUserId} className="hover:bg-canvas">
                  <td className="px-6 py-4 text-sm font-medium text-hi">{u.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      u.customerRole === 'master'
                        ? 'bg-indigo-500/10 text-indigo-400 ring-indigo-600/20'
                        : 'bg-canvas text-md ring-slate-400/20'
                    }`}>
                      {u.customerRole === 'master' ? 'Administrador' : 'Membro'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-md">
                    {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border bg-surface">
          <p className="text-sm text-lo">Nenhum usuário cadastrado ainda.</p>
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 self-start rounded-lg border border-border px-4 py-2 text-sm font-medium text-hi hover:bg-canvas"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar usuário
        </button>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-hi">Novo usuário membro</h3>
          <form
            action={(fd) => {
              startTransition(() => {
                formAction(fd)
                handleFormSuccess()
              })
            }}
            className="flex flex-col gap-4"
          >
            {state?.message && (
              <p className="text-sm text-red-400">{state.message}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-hi">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Nome completo"
                  className="rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1//"
                />
                {state?.errors?.name && <p className="text-xs text-red-400">{state.errors.name[0]}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-hi">Telefone</label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="+5511999999999"
                  className="rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1//"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-hi">
                  E-mail <span className="text-red-500">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="usuario@empresa.com"
                  className="rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1//"
                />
                {state?.errors?.email && <p className="text-xs text-red-400">{state.errors.email[0]}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-hi">
                  Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 8 caracteres"
                    className="w-full rounded-lg border border-border px-3 py-2 pr-10 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1//"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lo hover:text-md"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {state?.errors?.password && <p className="text-xs text-red-400">{state.errors.password[0]}</p>}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg btn-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {pending ? 'Criando...' : 'Criar usuário'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-md hover:bg-canvas"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
