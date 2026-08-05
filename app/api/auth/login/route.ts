import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthCookieValue, isValidInternalLogin } from '@/lib/auth'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body.username !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json(
      {
        success: false,
        message: '아이디 또는 비밀번호 형식이 올바르지 않습니다.',
      },
      { status: 400 },
    )
  }

  const username = body.username.trim()
  const password = body.password

  if (!isValidInternalLogin(username, password)) {
    return NextResponse.json(
      {
        success: false,
        message: '아이디 또는 비밀번호가 일치하지 않습니다.',
      },
      { status: 401 },
    )
  }

  const response = NextResponse.json({ success: true })

  response.cookies.set(AUTH_COOKIE_NAME, getAuthCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  })

  return response
}
