import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { admins } from '@/lib/schema'
import { checkLoginRateLimit } from '@/lib/rate-limit'
import { and, eq } from 'drizzle-orm'

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim() || 'unknown'
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

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

  const email = body.username.trim().toLowerCase()
  const rateLimit = await checkLoginRateLimit(getClientIp(request))

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        success: false,
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
      },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds
          ? { 'Retry-After': String(rateLimit.retryAfterSeconds) }
          : undefined,
      },
    )
  }

  const { error } = await auth.signIn.email({
    email,
    password: body.password,
  })

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: '아이디 또는 비밀번호가 일치하지 않습니다.',
      },
      { status: 401 },
    )
  }

  const [admin] = db
    ? await db.select({ id: admins.id }).from(admins).where(and(eq(admins.email, email), eq(admins.isActive, true))).limit(1)
    : []

  if (!admin) {
    await auth.signOut()
    return NextResponse.json({ success: false, message: '활성화된 관리자 계정을 찾지 못했습니다.' }, { status: 403 })
  }

  await db
    ?.update(admins)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(admins.id, admin.id))

  return NextResponse.json({ success: true })
}
