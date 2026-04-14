'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { DocumentFormState } from '@/lib/definitions'

export async function uploadDocument(
  customerId: string,
  _state: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const file = formData.get('file') as File | null
  const title = formData.get('title') as string
  const type = formData.get('type') as string
  const notes = formData.get('notes') as string

  if (!file || file.size === 0) {
    return { message: 'Selecione um arquivo.' }
  }
  if (!title?.trim()) {
    return { errors: { title: ['Título obrigatório.'] } }
  }
  if (!type) {
    return { errors: { type: ['Tipo obrigatório.'] } }
  }

  const upload = new FormData()
  upload.append('file', file)
  upload.append('title', title.trim())
  upload.append('type', type)
  if (notes?.trim()) upload.append('notes', notes.trim())

  try {
    await apiServer.upload(`/api/v1/customers/${customerId}/documents`, upload)
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'Erro ao enviar documento.' }
  }

  revalidatePath(`/customers/${customerId}/documents`)
  redirect(`/customers/${customerId}/documents`)
}

export async function deleteDocument(customerId: string, documentId: string): Promise<void> {
  await apiServer.delete(`/api/v1/customers/${customerId}/documents/${documentId}`)
  revalidatePath(`/customers/${customerId}/documents`)
  redirect(`/customers/${customerId}/documents`)
}

export async function updateDocumentStatus(
  customerId: string,
  documentId: string,
  status: string,
): Promise<void> {
  await apiServer.patch(`/api/v1/customers/${customerId}/documents/${documentId}/status`, { status })
  revalidatePath(`/customers/${customerId}/documents`)
}
