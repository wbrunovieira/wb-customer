import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import * as http from 'node:http'
import * as https from 'node:https'
import { Readable } from 'node:stream'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const url = new URL(`${BACKEND_URL}/api/v1/events`)
  const isHttps = url.protocol === 'https:'
  const transport = isHttps ? https : http

  const stream = await new Promise<Readable>((resolve, reject) => {
    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Upstream returned ${res.statusCode}`))
          res.resume()
          return
        }
        resolve(res)
      },
    )
    req.on('error', reject)
    req.end()
  }).catch(() => null)

  if (!stream) {
    return new NextResponse('Upstream error', { status: 502 })
  }

  const webStream = Readable.toWeb(stream) as ReadableStream

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
