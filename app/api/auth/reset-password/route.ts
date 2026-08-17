import { createHash } from 'crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { admins, passwordResetTokens } from '@/lib/schema'
import { hashPassword } from '@/lib/password'
import { getPasswordPolicyError } from '@/lib/password-policy'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body.token !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ success: false, message: '재설정 링크가 올바르지 않습니다.' }, { status: 400 })
  }

  const passwordPolicyError = getPasswordPolicyError(body.password)

  if (passwordPolicyError) {
    return NextResponse.json({
      success: false,
      code: 'passwordPolicy',
      message: '비밀번호는 12자 이상이며 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.',
    }, { status: 400 })
  }

  if (!db) {
    return NextResponse.json({ success: false, message: '서비스를 준비하는 중입니다.' }, { status: 500 })
  }

  const tokenRows = await db
    .select({ id: passwordResetTokens.id, adminId: passwordResetTokens.adminId })
    .from(passwordResetTokens)
    .where(and(
      eq(passwordResetTokens.tokenHash, hashToken(body.token)),
      gt(passwordResetTokens.expiresAt, new Date()),
      isNull(passwordResetTokens.usedAt),
    ))
    .limit(1)

  if (tokenRows.length === 0) {
    return NextResponse.json({ success: false, message: '재설정 링크가 만료되었거나 이미 사용되었습니다.' }, { status: 400 })
  }

  const tokenRow = tokenRows[0]
  await db.transaction(async (transaction) => {
    await transaction
      .update(admins)
      .set({ passwordHash: hashPassword(body.password), updatedAt: new Date() })
      .where(eq(admins.id, tokenRow.adminId))
    await transaction
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tokenRow.id))
  })

  return NextResponse.json({ success: true })
}
