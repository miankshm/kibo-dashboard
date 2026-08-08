import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { joinRequests } from '@/lib/schema'

export async function POST(request: Request) {
  if (!db) {
    return NextResponse.json({ success: false, message: '데이터베이스 연결이 준비되지 않았습니다.' }, { status: 500 })
  }

  try {
    const body = await request.json().catch(() => null)

    if (!body || typeof body.email !== 'string' || !body.email.trim()) {
      return NextResponse.json({ success: false, message: '이메일을 입력해주세요.' }, { status: 400 })
    }

    const email = body.email.trim().toLowerCase()

    const inserted = await db.insert(joinRequests).values({
      email,
      status: 'pending',
    }).returning()

    return NextResponse.json({ success: true, request: inserted[0] })
  } catch {
    return NextResponse.json({ success: false, message: '가입 요청을 등록하지 못했습니다.' }, { status: 500 })
  }
}
