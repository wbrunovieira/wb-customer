'use client'

import { useActionState, useTransition, useState } from 'react'
import { createPortalUser, revokePortalAccess, updatePortalUser, CreatePortalUserFormState } from '@/app/actions/portal'
import { PortalUser } from '@/lib/definitions'
import { useToast } from '@/components/toast/toast-context'

type Props = { customerId: string; initialUsers: PortalUser[] }

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

type EditState = { customerUserId: string; name: string; phone: string; customerRole: 'master' | 'member' } | null

export default function AdminPortalUsersManager({ customerId, initialUsers }: Props) {
  const { confirm, success, error } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [revokePending, startRevoke] = useTransition()
  const [editPending, startEdit] = useTransition()
  const [editState, setEditState] = useState<EditState>(null)

  const action = createPortalUser.bind(null, customerId)
  const [state, formAction, pending] = useActionState<CreatePortalUserFormState, FormData>(
    action,
    undefined,
  )

  function handleRevoke(customerUserId: string, name: string) {
    confirm({
      message: `Revogar o acesso de "${name}"? O usuário não poderá mais entrar no portal.`,
      confirmLabel: 'Revogar',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        startRevoke(async () => {
          try {
            await revokePortalAccess(customerId, customerUserId)
            success(`Acesso de "${name}" revogado.`)
          } catch {
            error('Não foi possível revogar o acesso.')
          }
        })
      },
    })
  }

  function handleEditOpen(u: PortalUser) {
    setEditState({
      customerUserId: u.customerUserId,
      name: u.name,
      phone: u.phone ?? '',
      customerRole: u.customerRole,
    })
  }

  function handleEditSave() {
    if (!editState) return
    startEdit(async () => {
      try {
        await updatePortalUser(customerId, editState.customerUserId, {
          name: editState.name,
          phone: editState.phone || undefined,
          customerRole: editState.customerRole,
        })
        success('Usuário atualizado.')
        setEditState(null)
      } catch {
        error('Não foi possível atualizar o usuário.')
      }
    })
  }

  const activeUsers = initialUsers.filter((u) => !u.deletedAt)

  return (
    <div className="flex flex-col gap-4">
      {activeUsers.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Perfil</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Criado em</th>
                <th className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activeUsers.map((u) =>
                editState?.customerUserId === u.customerUserId ? (
                  <tr key={u.customerUserId} className="bg-indigo-50">
                    <td className="px-6 py-3">
                      <input
                        value={editState.name}
                        onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <select
                        value={editState.customerRole}
                        onChange={(e) => setEditState({ ...editState, customerRole: e.target.value as 'master' | 'member' })}
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="master">Administrador</option>
                        <option value="member">Membro</option>
                      </select>
                    </td>
                    <td className="px-6 py-3">
                      <input
                        value={editState.phone}
                        onChange={(e) => setEditState({ ...editState, phone: e.target.value })}
                        placeholder="+5511999999999"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={handleEditSave}
                          disabled={editPending}
                          className="text-sm font-medium text-indigo-600 hover:underline disabled:opacity-50"
                        >
                          {editPending ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => setEditState(null)}
                          className="text-sm text-slate-500 hover:underline"
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={u.customerUserId} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{u.name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        u.customerRole === 'master'
                          ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
                          : 'bg-slate-50 text-slate-600 ring-slate-400/20'
                      }`}>
                        {u.customerRole === 'master' ? 'Administrador' : 'Membro'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <button
                          onClick={() => handleEditOpen(u)}
                          className="text-sm text-indigo-600 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleRevoke(u.customerUserId, u.name)}
                          disabled={revokePending}
                          className="text-sm text-red-500 hover:underline disabled:opacity-50"
                        >
                          Revogar acesso
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
          <p className="text-sm text-slate-400">Nenhum usuário do portal cadastrado.</p>
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 self-start rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Criar acesso ao portal
        </button>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Novo usuário do portal</h3>
          <p className="mb-4 text-xs text-slate-500">
            O usuário administrador pode criar sub-usuários e gerenciar o portal da empresa.
          </p>
          <form action={formAction} className="flex flex-col gap-4">
            {state?.message && (
              <p className="text-sm text-red-600">{state.message}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Nome completo"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {state?.errors?.name && <p className="text-xs text-red-600">{state.errors.name[0]}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Telefone</label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="+5511999999999"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  E-mail <span className="text-red-500">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="usuario@empresa.com"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {state?.errors?.email && <p className="text-xs text-red-600">{state.errors.email[0]}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 8 caracteres"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {state?.errors?.password && <p className="text-xs text-red-600">{state.errors.password[0]}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Perfil</label>
              <select
                name="customerRole"
                defaultValue="master"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="master">Administrador — pode gerenciar usuários e visualizar tudo</option>
                <option value="member">Membro — acesso somente leitura ao portal</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {pending ? 'Criando...' : 'Criar acesso'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
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
