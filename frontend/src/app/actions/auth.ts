'use server'

import { redirect } from 'next/navigation'
import { LoginFormState, LoginSchema, LoginResponse } from '@/lib/definitions'
import { clearSession, setSession } from '@/lib/session'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003'

export async function login(
  _state: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const validated = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { email, password } = validated.data

  let data: LoginResponse
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (res.status === 401) {
      return { message: 'E-mail ou senha incorretos.' }
    }

    if (!res.ok) {
      return { message: 'Erro ao conectar. Tente novamente.' }
    }

    data = (await res.json()) as LoginResponse
  } catch {
    return { message: 'Servidor indisponível. Tente novamente.' }
  }

  await setSession(data.accessToken, data.refreshToken)
  redirect(data.role === 'customer' ? '/portal/meetings' : '/dashboard')
}

export async function logout() {
  await clearSession()
  redirect('/login')
}
