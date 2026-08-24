import { NextRequest, NextResponse } from 'next/server'

const CHAT_ENDPOINT = 'https://n8n-production-80d62.up.railway.app/webhook/kibochat'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const response = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(30_000),
    })

    const responseBody = await response.text()
    const contentType = response.headers.get('content-type') ?? 'text/plain; charset=utf-8'

    return new NextResponse(responseBody, {
      status: response.status,
      headers: { 'Content-Type': contentType },
    })
  } catch {
    return NextResponse.json({ message: 'Chat service is temporarily unavailable.' }, { status: 502 })
  }
}
