import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login']
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003'

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    return JSON.parse(json)
  } catch {
    return null
  }
}

function getTokenExpiry(token: string): number | null {
  const payload = decodeJwtPayload(token)
  return (payload?.exp as number) ?? null
}

function isExpiredOrExpiringSoon(token: string): boolean {
  const exp = getTokenExpiry(token)
  if (!exp) return true
  // Renew if expires within the next 60 seconds
  return Date.now() / 1000 > exp - 60
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.accessToken ?? null
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const accessToken = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value

  // Not logged in at all → redirect to login
  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const response = NextResponse.next()

  // Access token missing or expiring soon → try to refresh
  if ((!accessToken || isExpiredOrExpiringSoon(accessToken)) && refreshToken) {
    const newAccessToken = await refreshAccessToken(refreshToken)

    if (!newAccessToken) {
      // Refresh failed (expired) → clear cookies and redirect to login
      const loginUrl = new URL('/login', request.url)
      const redirect = NextResponse.redirect(loginUrl)
      redirect.cookies.delete('access_token')
      redirect.cookies.delete('refresh_token')
      return redirect
    }

    // Set the new access token cookie
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15,
    })
  }

  // Role-based route protection
  const token = response.cookies.get('access_token')?.value ?? accessToken
  if (token) {
    try {
      const payload = decodeJwtPayload(token)
      const role = payload?.role as string

      // Customer users can only access /portal/*
      if (role === 'customer' && !pathname.startsWith('/portal')) {
        return NextResponse.redirect(new URL('/portal/meetings', request.url))
      }

      // Admin/employee users cannot access /portal/*
      if (role !== 'customer' && pathname.startsWith('/portal')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch {
      // Invalid token shape — let it pass, the page will handle 401
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
