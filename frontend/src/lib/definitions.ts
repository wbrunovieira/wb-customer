import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido.' }),
  password: z.string().min(1, { message: 'Senha obrigatória.' }),
})

export type LoginFormState =
  | { errors?: { email?: string[]; password?: string[] }; message?: string }
  | undefined

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  userId: string
  role: string
}

export type CurrentUser = {
  id: string
  email: string
  name: string
  role: string
}

export type CustomerStatus = 'active' | 'inactive'

export type Customer = {
  id: string
  name: string
  email: string
  phone: string | null
  document: string | null
  website: string | null
  notes: string | null
  status: CustomerStatus
  categoryId: string | null
  driveFolderId: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
}

export type CustomerListItem = {
  id: string
  name: string
  email: string
  phone: string | null
  status: CustomerStatus
  categoryId: string | null
  createdAt: string
}

export type CustomerContact = {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  isPrimary: boolean
}

export type CustomerDetail = Customer & {
  contacts: CustomerContact[]
  employees: { userId: string; assignedAt: string; assignedBy: string }[]
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
}

export type DocumentType = 'proposal' | 'contract' | 'addendum' | 'other'
export type DocumentStatus = 'pending_signature' | 'signed' | 'expired' | 'cancelled'

export type Document = {
  id: string
  customerId: string
  type: DocumentType
  title: string
  driveFileId: string
  driveViewUrl: string
  driveDownloadUrl: string
  mimeType: string
  sizeBytes: number | null
  status: DocumentStatus
  notes: string | null
  signedAt: string | null
  uploadedByUserId: string
  createdAt: string
  updatedAt: string
}

export type DocumentFormState =
  | { errors?: { title?: string[]; type?: string[] }; message?: string }
  | undefined

export type CustomerFormState =
  | {
      errors?: {
        name?: string[]
        email?: string[]
        phone?: string[]
        document?: string[]
        website?: string[]
        notes?: string[]
      }
      message?: string
    }
  | undefined
