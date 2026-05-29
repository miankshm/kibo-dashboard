import { NextRequest, NextResponse } from 'next/server'
import { getHolidayComparison } from '@/lib/mock-data'
import type { HolidayRange, StoreKey } from '@/lib/types'

function getStoreKey(value: string | null): StoreKey {
  if (value === 'kibo-north' || value === 'kibo-south' || value === 'all') return value
  return 'all'
}

function getRange(value: string | null): HolidayRange {
  if (value === '1y' || value === '3y' || value === '5y') return value
  return '1y'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const holidayId = searchParams.get('holidayId') ?? 'holiday-new-year'
  const data = getHolidayComparison({
    holidayId,
    storeKey: getStoreKey(searchParams.get('storeKey')),
    range: getRange(searchParams.get('range')),
  })

  return NextResponse.json({ success: true, data })
}
