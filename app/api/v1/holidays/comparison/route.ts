import { NextRequest, NextResponse } from 'next/server'
import { getHolidayComparisonFromDb } from '@/lib/db-queries'
import type { HolidayRange, StoreKey } from '@/lib/types'

function getStoreKey(value: string | null): StoreKey {
  if (value === 'st-clair' || value === 'woodbridge' || value === 'all') return value
  return 'all'
}

function getRange(value: string | null): HolidayRange {
  if (value === '1y' || value === '3y' || value === '5y') return value
  return '1y'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const holidayId = searchParams.get('holidayId')

    if (!holidayId) {
      return NextResponse.json({ success: false, message: 'holidayId is required' }, { status: 400 })
    }

    const data = await getHolidayComparisonFromDb({
      holidayId,
      storeKey: getStoreKey(searchParams.get('storeKey')),
      range: getRange(searchParams.get('range')),
    })

    if (!data) {
      return NextResponse.json({ success: false, message: 'Holiday not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Failed to fetch holiday comparison', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch holiday comparison' }, { status: 500 })
  }
}
