'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/api-server'

export type CreateSubUserFormState =
  | { errors?: { email?: string[]; password?: string[]; name?: string[] }; message?: string }
  | undefined

export async function createSubUser(
  _state: CreateSubUserFormState,
  formData: FormData,
): Promise<CreateSubUserFormState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string

  if (!email) return { errors: { email: ['E-mail obrigatório'] } }
  if (!password) return { errors: { password: ['Senha obrigatória'] } }
  if (!name) return { errors: { name: ['Nome obrigatório'] } }

  try {
    await apiServer.post('/api/v1/portal/users', {
      email,
      password,
      name,
      phone: phone || undefined,
    })
  } catch (err) {
    return { message: (err as Error).message }
  }

  revalidatePath('/portal/users')
  return undefined
}

export type CreatePortalUserFormState =
  | { errors?: { email?: string[]; password?: string[]; name?: string[] }; message?: string }
  | undefined

export async function createPortalUser(
  customerId: string,
  _state: CreatePortalUserFormState,
  formData: FormData,
): Promise<CreatePortalUserFormState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string

  if (!email) return { errors: { email: ['E-mail obrigatório'] } }
  if (!password) return { errors: { password: ['Senha obrigatória'] } }
  if (!name) return { errors: { name: ['Nome obrigatório'] } }

  try {
    await apiServer.post(`/api/v1/customers/${customerId}/portal-users`, {
      email,
      password,
      name,
      phone: phone || undefined,
      customerRole: 'master',
    })
  } catch (err) {
    return { message: (err as Error).message }
  }

  revalidatePath(`/customers/${customerId}/portal-users`)
  return undefined
}

export async function revokePortalAccess(customerId: string, customerUserId: string) {
  await apiServer.delete(`/api/v1/customers/${customerId}/portal-users/${customerUserId}`)
  revalidatePath(`/customers/${customerId}/portal-users`)
}
