import { NextRequest, NextResponse } from 'next/server'
import { getCashAnalysis } from '@/lib/mock-data'
import type { StoreKey } from '@/lib/types'

function getStoreKey(value: string | null): StoreKey {
  if (value === 'kibo-north' || value === 'kibo-south' || value === 'all') return value
  return 'all'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const data = getCashAnalysis({
    storeKey: getStoreKey(searchParams.get('storeKey')),
    periodDays: Number(searchParams.get('periodDays') ?? '14'),
    windowCount: Number(searchParams.get('windowCount') ?? '5'),
  })

  return NextResponse.json({ success: true, data })
}
