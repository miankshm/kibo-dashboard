import { NextRequest, NextResponse } from 'next/server'
import { createAiReportInDb } from '@/lib/db-queries'
import type { StoreKey } from '@/lib/types'

function getStoreKey(value: string | null): StoreKey {
  if (value === 'st-clair' || value === 'woodbridge' || value === 'all') return value
  return 'all'
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      storeKey?: StoreKey
      startDate?: string
      endDate?: string
      analysisType?: 'weekly' | 'monthly' | 'holiday' | 'cash_flow'
    }

    const today = new Date().toISOString().split('T')[0]
    const data = await createAiReportInDb({
      storeKey: getStoreKey(body.storeKey ?? 'all'),
      startDate: body.startDate ?? today,
      endDate: body.endDate ?? today,
      analysisType: body.analysisType ?? 'weekly',
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Failed to create AI report', error)
    return NextResponse.json({ success: false, message: 'Failed to generate AI report' }, { status: 500 })
  }
}
