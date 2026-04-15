'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/api-server'

export async function sendWhatsApp(
  customerId: string,
  to: string,
  text: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    await apiServer.post(`/api/v1/evolution/customers/${customerId}/send`, { to, text })
    revalidatePath(`/customers/${customerId}/activities`)
    return { ok: true }
  } catch (err) {
    return { ok: false, message: (err as Error).message }
  }
}

export async function sendEmail(
  customerId: string,
  data: {
    to: string[]
    cc?: string[]
    subject: string
    htmlBody: string
    threadId?: string
    attachments?: Array<{ fileName: string; mimeType: string; base64: string }>
  },
): Promise<{ ok: boolean; message?: string }> {
  try {
    await apiServer.post(`/api/v1/customers/${customerId}/email`, data)
    revalidatePath(`/customers/${customerId}/activities`)
    return { ok: true }
  } catch (err) {
    return { ok: false, message: (err as Error).message }
  }
}
