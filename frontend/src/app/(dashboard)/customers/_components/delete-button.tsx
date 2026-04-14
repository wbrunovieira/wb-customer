'use client'

import { deleteCustomer } from '@/app/actions/customers'

type Props = {
  id: string
  name: string
}

export default function DeleteButton({ id, name }: Props) {
  async function handleDelete() {
    if (!confirm(`Excluir o cliente "${name}"?`)) return
    await deleteCustomer(id)
  }

  return (
    <button
      onClick={handleDelete}
      className="rounded-lg px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
    >
      Excluir
    </button>
  )
}
