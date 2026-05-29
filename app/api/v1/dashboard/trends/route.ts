import { NextRequest, NextResponse } from 'next/server'
import { getDashboardTrends } from '@/lib/mock-data'
import type { SalesMode, SalesPeriod, StoreKey } from '@/lib/types'

function getStoreKey(value: string | null): StoreKey {
  if (value === 'kibo-north' || value === 'kibo-south' || value === 'all') return value
  return 'all'
}

function getPeriod(value: string | null): SalesPeriod {
  if (value === 'daily' || value === 'weekly' || value === 'monthly') return value
  return 'daily'
}

function getSalesMode(value: string | null): SalesMode {
  return value === 'net' ? 'net' : 'gross'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const language = searchParams.get('language') === 'en' ? 'en' : 'ko'
  const data = getDashboardTrends({
    storeKey: getStoreKey(searchParams.get('storeKey')),
    period: getPeriod(searchParams.get('period')),
    salesMode: getSalesMode(searchParams.get('salesMode')),
    language,
  })

  return NextResponse.json({ success: true, data })
}
