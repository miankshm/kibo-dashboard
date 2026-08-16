import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
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

  const email = body.username.trim().toLowerCase()
  const { error } = await auth.signIn.email({
    email,
    password: body.password,
  })

  if (!error) {
    return NextResponse.json({ success: true })
  }

  // Migrate accounts created before Neon Auth was enabled on their first login.
  if (db) {
    const legacyAdmins = await db
      .select()
      .from(admins)
      .where(and(eq(admins.email, email), eq(admins.isActive, true)))
      .limit(1)

    const legacyAdmin = legacyAdmins[0]

    if (legacyAdmin && verifyPassword(body.password, legacyAdmin.passwordHash)) {
      const migration = await auth.signUp.email({
        email: legacyAdmin.email,
        name: legacyAdmin.name,
        password: body.password,
      })

      if (!migration.error) {
        await db
          .update(admins)
          .set({ lastLoginAt: new Date(), updatedAt: new Date() })
          .where(eq(admins.id, legacyAdmin.id))

        return NextResponse.json({ success: true })
      }
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: '아이디 또는 비밀번호가 일치하지 않습니다.',
    },
    { status: 401 },
  )
}
