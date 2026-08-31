import { NextRequest, NextResponse } from 'next/server'
import { getDateRangeReportFromDb } from '@/lib/db-queries'
import type { StoreKey } from '@/lib/types'

export const dynamic = 'force-dynamic'

function getStoreKey(value: string | null): StoreKey {
  return value === 'st-clair' || value === 'woodbridge' || value === 'all' ? value : 'all'
}

function isDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime()))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!isDate(startDate) || !isDate(endDate) || startDate > endDate) {
    return NextResponse.json({ success: false, message: 'A valid startDate and endDate are required.' }, { status: 400 })
  }

  try {
    const data = await getDateRangeReportFromDb({ storeKey: getStoreKey(searchParams.get('storeKey')), startDate, endDate })
    return NextResponse.json({ success: true, data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to generate report data', error)
    return NextResponse.json({ success: false, message: 'Failed to generate report data.' }, { status: 500 })
  }
}