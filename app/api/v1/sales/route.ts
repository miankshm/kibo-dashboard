import { NextRequest, NextResponse } from 'next/server'
import { listSales, upsertSale } from '@/lib/mock-data'
import type { DailySalesInput, NonAggregateStoreKey, StoreKey } from '@/lib/types'

function isStoreKey(value: string | null): value is StoreKey {
  return value === 'all' || value === 'kibo-north' || value === 'kibo-south'
}

function isPersistedStoreKey(value: string | undefined): value is NonAggregateStoreKey {
  return value === 'kibo-north' || value === 'kibo-south'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const storeKeyValue = searchParams.get('storeKey')
  const page = Number(searchParams.get('page') ?? '1')
  const limit = Number(searchParams.get('limit') ?? '30')
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

  const payload = listSales({
    storeKey: isStoreKey(storeKeyValue) ? storeKeyValue : undefined,
    startDate: searchParams.get('startDate') ?? undefined,
    endDate: searchParams.get('endDate') ?? undefined,
    page,
    limit,
    sortOrder,
  })

  return NextResponse.json({ success: true, data: payload })
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<DailySalesInput>

  if (!isPersistedStoreKey(body.storeKey)) {
    return NextResponse.json(
      { success: false, message: 'Invalid storeKey', errors: [{ field: 'storeKey', message: 'storeKey must be kibo-north or kibo-south' }] },
      { status: 400 }
    )
  }

  if (!body.salesDate) {
    return NextResponse.json(
      { success: false, message: 'salesDate is required', errors: [{ field: 'salesDate', message: 'salesDate is required' }] },
      { status: 400 }
    )
  }

  const record = upsertSale({
    storeKey: body.storeKey,
    salesDate: body.salesDate,
    cardSales: Number(body.cardSales ?? 0),
    cashSales: Number(body.cashSales ?? 0),
    uberEatsSales: Number(body.uberEatsSales ?? 0),
    doorDashSales: Number(body.doorDashSales ?? 0),
    cashAndCarrySales: Number(body.cashAndCarrySales ?? 0),
    tips: Number(body.tips ?? 0),
    actualClosingCash: Number(body.actualClosingCash ?? 0),
    note: body.note,
  })

  return NextResponse.json({
    success: true,
    data: {
      ...record,
      storeId: record.storeKey,
      isUpsert: true,
    },
  })
}
