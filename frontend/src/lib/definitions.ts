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
