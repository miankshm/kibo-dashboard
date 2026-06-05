import { NextResponse } from 'next/server'
import { getHolidaysFromDb } from '@/lib/db-queries'

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: await getHolidaysFromDb(),
    })
  } catch (error) {
    console.error('Failed to fetch holidays', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch holidays' }, { status: 500 })
  }
}
