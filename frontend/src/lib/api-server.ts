import 'server-only'
import { cookies } from 'next/headers'
import { getAccessToken, getRefreshToken, setSession } from './session'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003'

type FetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

async function refreshAndRetry(): Promise<string | null> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null

  const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) return null

  const data = await res.json()
  if (!data.accessToken) return null

  await setSession(data.accessToken, refreshToken)
  return data.accessToken
}

async function apiFetch<T>(path: string, options: FetchOptions = {}, retry = true): Promise<T> {
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

  // On 401, try once to refresh and retry
  if (res.status === 401 && retry) {
    const newToken = await refreshAndRetry()
    if (newToken) {
      return apiFetch<T>(path, options, false)
    }
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message ?? `HTTP ${res.status}`)
  }

  const text = await res.text()
  return text ? (JSON.parse(text) as T) : (undefined as T)
}

async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = await getAccessToken()

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Upload failed' }))
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
  upload: <T>(path: string, formData: FormData) => apiUpload<T>(path, formData),
}
