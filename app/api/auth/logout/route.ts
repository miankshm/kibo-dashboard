import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'

export async function POST() {
  const { error } = await auth.signOut()

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
