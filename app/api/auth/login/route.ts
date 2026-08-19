import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, createSessionToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { admins } from '@/lib/schema'
import { verifyPassword } from '@/lib/password'
import { and, eq } from 'drizzle-orm'

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
  const normalizedUsername = username.toLowerCase()

  let isAuthenticated = false
  let loginIdentity = normalizedUsername

  if (db) {
    const foundAdmins = await db
      .select()
      .from(admins)
      .where(and(eq(admins.email, username.toLowerCase()), eq(admins.isActive, true)))
      .limit(1)

    if (foundAdmins.length > 0) {
      isAuthenticated = verifyPassword(password, foundAdmins[0].passwordHash)

      if (isAuthenticated) {
        loginIdentity = foundAdmins[0].email
        await db
          .update(admins)
          .set({ lastLoginAt: new Date(), updatedAt: new Date() })
          .where(eq(admins.id, foundAdmins[0].id))
      }
    }
  }

  if (!isAuthenticated) {
    return NextResponse.json(
      {
        success: false,
        message: '아이디 또는 비밀번호가 일치하지 않습니다.',
      },
      { status: 401 },
    )
  }

  const response = NextResponse.json({ success: true })

  response.cookies.set(AUTH_COOKIE_NAME, createSessionToken(loginIdentity), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })

  return response
}
