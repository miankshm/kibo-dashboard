import { NextRequest, NextResponse } from 'next/server'
import { getUpcomingHolidaysFromDb } from '@/lib/db-queries'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const withinDays = Number(searchParams.get('withinDays') ?? '30')

    return NextResponse.json({
      success: true,
      data: await getUpcomingHolidaysFromDb(withinDays),
    })
  } catch (error) {
    console.error('Failed to fetch upcoming holidays', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch upcoming holidays' }, { status: 500 })
  }
}
