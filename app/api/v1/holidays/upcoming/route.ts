import { NextRequest, NextResponse } from 'next/server'
import { getUpcomingHolidays } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const withinDays = Number(searchParams.get('withinDays') ?? '30')

  return NextResponse.json({
    success: true,
    data: getUpcomingHolidays(withinDays),
  })
}
