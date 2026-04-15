'use client'

import { useActionState } from 'react'
import { createCustomer, updateCustomer } from '@/app/actions/customers'
import { Customer, CustomerFormState } from '@/lib/definitions'

type Props = {
  customer?: Customer
}

export default function CustomerForm({ customer }: Props) {
  const action = customer
    ? updateCustomer.bind(null, customer.id)
    : createCustomer

  const [state, formAction, pending] = useActionState<CustomerFormState, FormData>(action, undefined)

  return (
    <form action={formAction} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-5">
        {state?.message && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {state.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-hi" htmlFor="name">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={customer?.name}
              placeholder="Acme Corp"
              className="rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1//"
            />
            {state?.errors?.name && (
              <p className="text-xs text-red-400">{state.errors.name[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-hi" htmlFor="email">
              E-mail <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={customer?.email}
              placeholder="contato@empresa.com"
              className="rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1//"
            />
            {state?.errors?.email && (
              <p className="text-xs text-red-400">{state.errors.email[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-hi" htmlFor="phone">
              Telefone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={customer?.phone ?? ''}
              placeholder="+55 11 99999-9999"
              className="rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1//"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-hi" htmlFor="document">
              CNPJ
            </label>
            <input
              id="document"
              name="document"
              type="text"
              defaultValue={customer?.document ?? ''}
              placeholder="12.345.678/0001-99"
              className="rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1//"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-hi" htmlFor="website">
              Website
            </label>
            <input
              id="website"
              name="website"
              type="url"
              defaultValue={customer?.website ?? ''}
              placeholder="https://empresa.com"
              className="rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1//"
            />
          </div>

          {customer && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-hi" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={customer.status}
                className="rounded-lg border border-border px-3 py-2 text-sm text-hi focus:border-brand/60 focus:outline-none focus:ring-1//"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-hi" htmlFor="notes">
            Observações
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={customer?.notes ?? ''}
            placeholder="Informações adicionais sobre o cliente..."
            className="rounded-lg border border-border px-3 py-2 text-sm text-hi placeholder-lo focus:border-brand/60 focus:outline-none focus:ring-1//"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
          <a
            href={customer ? `/customers/${customer.id}` : '/customers'}
            className="rounded-lg px-4 py-2 text-sm font-medium text-hi transition-colors hover:bg-elevated"
          >
            Cancelar
          </a>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg btn-brand px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60"
          >
            {pending ? 'Salvando...' : customer ? 'Salvar alterações' : 'Criar cliente'}
          </button>
        </div>
      </div>
    </form>
  )
}
