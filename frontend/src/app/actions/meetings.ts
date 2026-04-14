'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/api-server'
import { MeetingFormState, MeetingTypeFormState } from '@/lib/definitions'

// ─── Schedule meeting ────────────────────────────────────────

export async function scheduleMeeting(
  customerId: string,
  _state: MeetingFormState,
  formData: FormData,
): Promise<MeetingFormState> {
  const title = formData.get('title') as string
  const startAt = formData.get('startAt') as string
  const endAt = formData.get('endAt') as string
  const meetingTypeId = formData.get('meetingTypeId') as string
  const description = formData.get('description') as string
  const contactId = formData.get('contactId') as string
  const attendeeEmailsRaw = formData.get('attendeeEmails') as string

  if (!title) return { errors: { title: ['Título obrigatório'] } }
  if (!startAt) return { errors: { startAt: ['Data/hora de início obrigatória'] } }
  if (!endAt) return { errors: { endAt: ['Data/hora de término obrigatória'] } }

  const attendeeEmails = attendeeEmailsRaw
    ? attendeeEmailsRaw.split(',').map((e) => e.trim()).filter(Boolean)
    : []

  try {
    await apiServer.post(`/api/v1/customers/${customerId}/meetings`, {
      title,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      meetingTypeId: meetingTypeId || undefined,
      description: description || undefined,
      contactId: contactId || undefined,
      attendeeEmails,
    })
  } catch (err) {
    return { message: (err as Error).message }
  }

  redirect(`/customers/${customerId}/meetings`)
}

// ─── Cancel meeting ──────────────────────────────────────────

export async function cancelMeeting(customerId: string, meetingId: string) {
  await apiServer.delete(`/api/v1/customers/${customerId}/meetings/${meetingId}`)
  revalidatePath(`/customers/${customerId}/meetings`)
  revalidatePath('/meetings')
}

// ─── Update summary ──────────────────────────────────────────

export async function updateMeetingSummary(
  customerId: string,
  meetingId: string,
  _state: unknown,
  formData: FormData,
) {
  const summary = formData.get('summary') as string

  try {
    await apiServer.patch(
      `/api/v1/customers/${customerId}/meetings/${meetingId}/summary`,
      { summary: summary || null },
    )
  } catch (err) {
    return { message: (err as Error).message }
  }

  revalidatePath(`/customers/${customerId}/meetings`)
  revalidatePath('/meetings')
  return { success: true }
}

// ─── Meeting Types ───────────────────────────────────────────

export async function createMeetingType(
  _state: MeetingTypeFormState,
  formData: FormData,
): Promise<MeetingTypeFormState> {
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const durationMinutes = Number(formData.get('durationMinutes'))
  const color = formData.get('color') as string

  if (!name) return { errors: { name: ['Nome obrigatório'] } }
  if (!durationMinutes || durationMinutes < 5)
    return { errors: { durationMinutes: ['Duração mínima de 5 minutos'] } }

  try {
    await apiServer.post('/api/v1/meeting-types', {
      name,
      description: description || undefined,
      durationMinutes,
      color: color || '#3B82F6',
    })
  } catch (err) {
    return { message: (err as Error).message }
  }

  revalidatePath('/admin/meeting-types')
  return undefined
}

export async function updateMeetingType(
  meetingTypeId: string,
  _state: MeetingTypeFormState,
  formData: FormData,
): Promise<MeetingTypeFormState> {
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const durationMinutes = Number(formData.get('durationMinutes'))
  const color = formData.get('color') as string
  const isActive = formData.get('isActive') === 'true'

  try {
    await apiServer.patch(`/api/v1/meeting-types/${meetingTypeId}`, {
      name: name || undefined,
      description: description || undefined,
      durationMinutes: durationMinutes || undefined,
      color: color || undefined,
      isActive,
    })
  } catch (err) {
    return { message: (err as Error).message }
  }

  revalidatePath('/admin/meeting-types')
  return undefined
}

export async function deleteMeetingType(meetingTypeId: string) {
  await apiServer.delete(`/api/v1/meeting-types/${meetingTypeId}`)
  revalidatePath('/admin/meeting-types')
}
