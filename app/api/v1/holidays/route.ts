import { NextResponse } from 'next/server'
import { getHolidays } from '@/lib/mock-data'

export async function GET() {
  return NextResponse.json({
    success: true,
    data: getHolidays(),
  })
}
