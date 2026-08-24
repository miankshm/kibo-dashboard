import { createHash, randomBytes } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { admins, passwordResetTokens } from '@/lib/schema'

const TOKEN_LIFETIME_MS = 30 * 60 * 1000

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body.email !== 'string' || !body.email.trim()) {
    return NextResponse.json({ success: false, message: '이메일을 입력해주세요.' }, { status: 400 })
  }

  if (!db) {
    return NextResponse.json({ success: false, message: '서비스를 준비하는 중입니다.' }, { status: 500 })
  }

  const email = body.email.trim().toLowerCase()
  const foundAdmins = await db
    .select({ id: admins.id, email: admins.email })
    .from(admins)
    .where(and(eq(admins.email, email), eq(admins.isActive, true)))
    .limit(1)

  if (foundAdmins.length === 0 || !foundAdmins[0].email) {
    return NextResponse.json({ success: true })
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS)

  await db.insert(passwordResetTokens).values({
    adminId: foundAdmins[0].id,
    tokenHash: hashToken(token),
    expiresAt,
  })

  const resetPath = `/reset-password?token=${encodeURIComponent(token)}`
  const resetUrl = `${process.env.APP_BASE_URL ?? new URL(request.url).origin}${resetPath}`
  const emailResult = await sendEmail({
    to: foundAdmins[0].email,
    subject: '[Kibo Dashboard] Password reset link / 비밀번호 재설정 링크',
    text: `Password reset\n\nUse the link below within 30 minutes to reset your Kibo Dashboard password.\nReset password: ${resetUrl}\n\n비밀번호 재설정\n\n아래 링크를 30분 이내에 이용해 Kibo Dashboard 비밀번호를 재설정해주세요.\n비밀번호 재설정: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 8px;">Password reset</h2>
        <p>Hello,</p>
        <p>Use the link below within 30 minutes to reset your Kibo Dashboard password.</p>
        <p style="margin: 20px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 14px; border-radius: 8px; text-decoration: none; background: #2563eb; color: #ffffff;">Reset password</a>
        </p>
        <p>If the link does not open, copy and paste the address below into your browser.</p>
        <p style="word-break: break-all;">${resetUrl}</p>

        <hr style="margin: 28px 0; border: 0; border-top: 1px solid #e5e7eb;" />

        <h2 style="margin-bottom: 8px;">비밀번호 재설정</h2>
        <p>안녕하세요.</p>
        <p>아래 링크를 30분 이내에 이용해 Kibo Dashboard 비밀번호를 재설정해주세요.</p>
        <p style="margin: 20px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 14px; border-radius: 8px; text-decoration: none; background: #2563eb; color: #ffffff;">비밀번호 재설정</a>
        </p>
        <p>링크가 열리지 않으면 아래 주소를 브라우저에 붙여넣어 주세요.</p>
        <p style="word-break: break-all;">${resetUrl}</p>
      </div>
    `,
  })

  if (!emailResult.ok) {
    return NextResponse.json({ success: false, message: '재설정 이메일을 보내지 못했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
