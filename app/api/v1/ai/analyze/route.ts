import { NextRequest, NextResponse } from 'next/server'
import { createAIReport } from '@/lib/mock-data'
import type { StoreKey } from '@/lib/types'

function getStoreKey(value: string | null): StoreKey {
  if (value === 'st-clair' || value === 'woodbridge' || value === 'all') return value
  return 'all'
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    storeKey?: StoreKey
    startDate?: string
    endDate?: string
    analysisType?: 'weekly' | 'monthly' | 'holiday' | 'cash_flow'
  }

  const data = createAIReport({
    storeKey: getStoreKey(body.storeKey ?? 'all'),
    startDate: body.startDate ?? new Date().toISOString().split('T')[0],
    endDate: body.endDate ?? new Date().toISOString().split('T')[0],
    analysisType: body.analysisType ?? 'weekly',
  })

  return NextResponse.json({ success: true, data })
}
