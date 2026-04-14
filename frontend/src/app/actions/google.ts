'use server'

import { redirect } from 'next/navigation'
import { apiServer } from '@/lib/api-server'

export async function disconnectGoogle() {
  await apiServer.delete('/api/v1/google/disconnect')
  redirect('/admin/google')
}

export async function connectGoogle() {
  const { url } = await apiServer.get<{ url: string }>('/api/v1/google/auth-url')
  redirect(url)
}
