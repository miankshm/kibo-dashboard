import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { admins, joinRequests } from '@/lib/schema'
import { hashPassword } from '@/lib/password'
import { getPasswordPolicyError } from '@/lib/password-policy'

const INVITE_VALID_HOURS = 72

export async function POST(request: Request) {
  if (!db) {
    return NextResponse.json({ success: false, message: '데이터베이스 연결이 준비되지 않았습니다.' }, { status: 500 })
  }

  try {
    const body = await request.json().catch(() => null)

    if (!body || typeof body.token !== 'string' || typeof body.password !== 'string') {
      return NextResponse.json({ success: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
    }

    const token = body.token.trim()
    const password = body.password
    const requestedName = typeof body.name === 'string' ? body.name.trim() : ''

    if (!token) {
      return NextResponse.json({ success: false, message: '유효하지 않은 초대 링크입니다.' }, { status: 400 })
    }

    if (getPasswordPolicyError(password)) {
      return NextResponse.json({
        success: false,
        code: 'passwordPolicy',
        message: '비밀번호는 12자 이상이며 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.',
      }, { status: 400 })
    }

    const rows = await db
      .select()
      .from(joinRequests)
      .where(and(eq(joinRequests.inviteToken, token), eq(joinRequests.status, 'approved')))
      .limit(1)

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: '이미 사용되었거나 만료된 링크입니다.' }, { status: 400 })
    }

    const target = rows[0]

    if (!target.inviteSentAt) {
      return NextResponse.json({ success: false, message: '초대 메일 정보가 없습니다. 다시 승인해 주세요.' }, { status: 400 })
    }

    const expireAt = new Date(target.inviteSentAt)
    expireAt.setHours(expireAt.getHours() + INVITE_VALID_HOURS)

    if (Date.now() > expireAt.getTime()) {
      return NextResponse.json({ success: false, message: '초대 링크가 만료되었습니다. 다시 승인 요청을 받아주세요.' }, { status: 400 })
    }

    const passwordHash = hashPassword(password)
    const fallbackName = target.email.split('@')[0] || 'New Admin'
    const safeName = requestedName || fallbackName

    const existingAdmin = await db.select().from(admins).where(eq(admins.email, target.email)).limit(1)

    if (existingAdmin.length > 0) {
      await db
        .update(admins)
        .set({
          passwordHash,
          isActive: true,
          name: existingAdmin[0].name || safeName,
          updatedAt: new Date(),
        })
        .where(eq(admins.id, existingAdmin[0].id))
    } else {
      await db.insert(admins).values({
        name: safeName,
        email: target.email,
        passwordHash,
        isActive: true,
        receiveReportEmails: true,
      })
    }

    await db
      .update(joinRequests)
      .set({
        status: 'activated',
        inviteToken: null,
        updatedAt: new Date(),
      })
      .where(eq(joinRequests.id, target.id))

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, message: '계정 활성화에 실패했습니다.' }, { status: 500 })
  }
}
