'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/api-server'

function revalidateActivities(customerId: string) {
  revalidatePath(`/customers/${customerId}/activities`)
}

export async function createActivity(
  customerId: string,
  _state: unknown,
  formData: FormData,
) {
  const type = formData.get('type') as string
  const subject = formData.get('subject') as string
  const description = formData.get('description') as string
  const status = formData.get('status') as string
  const scheduledAt = formData.get('scheduledAt') as string
  const occurredAt = formData.get('occurredAt') as string

  if (!type) return { errors: { type: ['Tipo obrigatório'] } }

  try {
    await apiServer.post(`/api/v1/customers/${customerId}/activities`, {
      type,
      subject: subject || undefined,
      description: description || undefined,
      status: status || 'open',
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
    })
  } catch (err) {
    return { message: (err as Error).message }
  }

  revalidateActivities(customerId)
  return { success: true }
}

export async function updateActivity(
  customerId: string,
  activityId: string,
  data: { status?: string; description?: string },
) {
  try {
    await apiServer.patch(`/api/v1/customers/${customerId}/activities/${activityId}`, data)
  } catch (err) {
    return { message: (err as Error).message }
  }
  revalidateActivities(customerId)
  return { success: true }
}

export async function deleteActivity(customerId: string, activityId: string) {
  await apiServer.delete(`/api/v1/customers/${customerId}/activities/${activityId}`)
  revalidateActivities(customerId)
}
