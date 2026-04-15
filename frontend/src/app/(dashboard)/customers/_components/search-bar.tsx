'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

type Props = {
  defaultValue?: string
  defaultStatus?: string
}

export default function SearchBar({ defaultValue, defaultStatus }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-lo"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          defaultValue={defaultValue}
          onChange={(e) => updateParams('search', e.target.value)}
          className="w-full rounded-lg border border-border-strong bg-elevated py-2 pl-9 pr-3 text-sm text-hi placeholder-lo transition-colors focus:border-brand/60 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-brand/25"
        />
      </div>

      <select
        defaultValue={defaultStatus}
        onChange={(e) => updateParams('status', e.target.value)}
        className="rounded-lg border border-border-strong bg-elevated px-3 py-2 text-sm text-hi transition-colors focus:border-brand/60 focus:outline-none focus:ring-1 focus:ring-brand/25 cursor-pointer"
      >
        <option value="">Todos os status</option>
        <option value="active">Ativo</option>
        <option value="inactive">Inativo</option>
      </select>
    </div>
  )
}
