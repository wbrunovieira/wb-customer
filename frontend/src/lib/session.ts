import 'server-only'
import { cookies } from 'next/headers'

const ACCESS_COOKIE = 'access_token'
const REFRESH_COOKIE = 'refresh_token'

export async function setSession(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies()

  cookieStore.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15, // 15 minutes
  })

  cookieStore.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(ACCESS_COOKIE)?.value
}

export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(REFRESH_COOKIE)?.value
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(ACCESS_COOKIE)
  cookieStore.delete(REFRESH_COOKIE)
}
