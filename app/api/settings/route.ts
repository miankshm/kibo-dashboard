import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { admins, joinRequests } from '@/lib/schema'
import { sendEmail } from '@/lib/email'
import { eq, desc } from 'drizzle-orm'
import { AUTH_IDENTITY_COOKIE_NAME } from '@/lib/auth'

async function resolveCurrentAdmin(request: NextRequest) {
  const identity = request.cookies.get(AUTH_IDENTITY_COOKIE_NAME)?.value?.trim().toLowerCase()

  if (identity) {
    const matched = await db!.select().from(admins).where(eq(admins.email, identity)).limit(1)

    if (matched[0]) {
      return matched[0]
    }
  }

  const fallback = await db!.select().from(admins).limit(1)
  return fallback[0] ?? null
}

export async function GET(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ success: true, notifyUpdates: true, requests: [] })
  }

  try {
    const currentAdmin = await resolveCurrentAdmin(request)
    const requestRows = await db.select().from(joinRequests).orderBy(desc(joinRequests.requestedAt))

    return NextResponse.json({
      success: true,
      notifyUpdates: currentAdmin?.receiveUpdateEmails ?? true,
      requests: requestRows.map((request) => ({
        id: request.id,
        email: request.email,
        status: request.status,
        requestedAt: request.requestedAt?.toISOString() ?? null,
      })),
    })
  } catch {
    return NextResponse.json({ success: false, message: '설정 정보를 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ success: true })
  }

  try {
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, message: '잘못된 요청입니다.' }, { status: 400 })
    }

    if (typeof body.notifyUpdates === 'boolean') {
      const currentAdmin = await resolveCurrentAdmin(request)

      if (!currentAdmin) {
        return NextResponse.json({ success: false, message: '관리자 계정을 찾지 못했습니다.' }, { status: 404 })
      }

      await db.update(admins)
        .set({ receiveUpdateEmails: body.notifyUpdates })
        .where(eq(admins.id, currentAdmin.id))
    }

    if (typeof body.requestId === 'string' && body.action === 'approve') {
      const targetRows = await db.select().from(joinRequests).where(eq(joinRequests.id, body.requestId)).limit(1)

      if (targetRows.length === 0) {
        return NextResponse.json({ success: false, message: '요청 대상을 찾지 못했습니다.' }, { status: 404 })
      }

      const target = targetRows[0]

      if (target.status === 'activated') {
        return NextResponse.json({
          success: true,
          status: 'activated',
          emailSent: true,
          message: '이미 계정 활성화가 완료된 요청입니다.',
        })
      }

      if (target.status === 'approved') {
        return NextResponse.json({
          success: true,
          status: 'approved',
          emailSent: target.inviteSentAt !== null,
          message: '이미 승인된 요청입니다.',
        })
      }

      if (target.status !== 'pending') {
        return NextResponse.json({ success: false, message: '처리할 수 없는 요청 상태입니다.' }, { status: 400 })
      }

      const inviteToken = crypto.randomUUID().replace(/-/g, '')
      const origin = new URL(request.url).origin
      const setupPath = `/activate?token=${encodeURIComponent(inviteToken)}`
      const setupUrl = `${process.env.APP_BASE_URL ?? origin}${setupPath}`

      await db.update(joinRequests)
        .set({
          status: 'approved',
          approvedAt: new Date(),
          inviteToken,
        })
        .where(eq(joinRequests.id, body.requestId))

      const emailResult = await sendEmail({
        to: target.email,
        subject: '[Kibo Dashboard] 가입 요청이 승인되었습니다',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin-bottom: 8px;">가입 요청 승인 안내</h2>
            <p>안녕하세요.</p>
            <p>요청하신 Kibo Dashboard 가입이 승인되었습니다.</p>
            <p>아래 링크에서 비밀번호를 설정해 계정을 활성화해주세요.</p>
            <p style="margin: 20px 0;">
              <a href="${setupUrl}" style="display: inline-block; padding: 10px 14px; border-radius: 8px; text-decoration: none; background: #2563eb; color: #ffffff;">비밀번호 설정하기</a>
            </p>
            <p>링크가 열리지 않으면 아래 주소를 브라우저에 붙여넣어 주세요.</p>
            <p style="word-break: break-all;">${setupUrl}</p>
          </div>
        `,
        text: `가입 요청이 승인되었습니다. 아래 링크에서 비밀번호를 설정해주세요: ${setupUrl}`,
      })

      if (!emailResult.ok) {
        return NextResponse.json({
          success: true,
          status: 'approved',
          emailSent: false,
          message: emailResult.message ?? '승인은 완료되었지만 메일 발송에 실패했습니다.',
        })
      }

      await db.update(joinRequests)
        .set({
          inviteSentAt: new Date(),
        })
        .where(eq(joinRequests.id, body.requestId))

      return NextResponse.json({
        success: true,
        status: 'approved',
        emailSent: true,
        message: '승인 및 메일 발송이 완료되었습니다.',
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, message: '설정을 저장하지 못했습니다.' }, { status: 500 })
  }
}
