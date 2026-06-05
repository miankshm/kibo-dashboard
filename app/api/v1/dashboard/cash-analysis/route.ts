import { NextRequest, NextResponse } from 'next/server'
import { getCashAnalysisFromDb } from '@/lib/db-queries'
import type { StoreKey } from '@/lib/types'

function getStoreKey(value: string | null): StoreKey {
  if (value === 'st-clair' || value === 'woodbridge' || value === 'all') return value
  return 'all'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const data = await getCashAnalysisFromDb({
      storeKey: getStoreKey(searchParams.get('storeKey')),
      periodDays: Number(searchParams.get('periodDays') ?? '14'),
      windowCount: Number(searchParams.get('windowCount') ?? '5'),
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Failed to fetch cash analysis', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch cash analysis' }, { status: 500 })
  }
}
