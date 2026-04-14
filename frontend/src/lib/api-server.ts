import 'server-only'
import { getAccessToken } from './session'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003'

type FetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const token = await getAccessToken()
  const { body, ...rest } = options

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message ?? `HTTP ${res.status}`)
  }

  const text = await res.text()
  return text ? (JSON.parse(text) as T) : (undefined as T)
}

export const apiServer = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
