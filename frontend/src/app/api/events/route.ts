import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const upstream = await fetch(`${BACKEND_URL}/api/v1/events`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    // @ts-expect-error — Node fetch supports duplex
    duplex: 'half',
  })

  if (!upstream.ok || !upstream.body) {
    return new NextResponse('Upstream error', { status: 502 })
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
