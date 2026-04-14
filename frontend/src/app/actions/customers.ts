'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { apiServer } from '@/lib/api-server'
import { CustomerFormState } from '@/lib/definitions'

const CustomerSchema = z.object({
  name: z.string().min(1, { message: 'Nome obrigatório.' }),
  email: z.string().email({ message: 'E-mail inválido.' }),
  phone: z.string().optional(),
  document: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
})

export async function createCustomer(
  _state: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const raw = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    document: formData.get('document') as string,
    website: formData.get('website') as string,
    notes: formData.get('notes') as string,
  }

  const validated = CustomerSchema.safeParse(raw)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const body: Record<string, string> = {
    name: validated.data.name,
    email: validated.data.email,
  }
  if (validated.data.phone) body.phone = validated.data.phone
  if (validated.data.document) body.document = validated.data.document
  if (validated.data.website) body.website = validated.data.website
  if (validated.data.notes) body.notes = validated.data.notes

  try {
    await apiServer.post('/api/v1/customers', body)
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'Erro ao criar cliente.' }
  }

  revalidatePath('/customers')
  redirect('/customers')
}

export async function updateCustomer(
  id: string,
  _state: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const raw = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    document: formData.get('document') as string,
    website: formData.get('website') as string,
    notes: formData.get('notes') as string,
    status: formData.get('status') as string,
  }

  const validated = CustomerSchema.extend({
    status: z.enum(['lead', 'active', 'inactive']).optional(),
  }).safeParse(raw)

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const body: Record<string, string | null> = {
    name: validated.data.name,
    email: validated.data.email,
    phone: validated.data.phone || null,
    document: validated.data.document || null,
    website: validated.data.website || null,
    notes: validated.data.notes || null,
  }
  if (validated.data.status) body.status = validated.data.status

  try {
    await apiServer.patch(`/api/v1/customers/${id}`, body)
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'Erro ao atualizar cliente.' }
  }

  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  redirect(`/customers/${id}`)
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiServer.delete(`/api/v1/customers/${id}`)
  revalidatePath('/customers')
  redirect('/customers')
}
