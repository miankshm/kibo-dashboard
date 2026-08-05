import { NextRequest, NextResponse } from 'next/server'
import { deleteSaleInDb, listSalesFromDb, upsertSaleInDb } from '@/lib/db-queries'
import type { DailySalesInput, NonAggregateStoreKey, StoreKey } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isStoreKey(value: string | null): value is StoreKey {
  return value === 'all' || value === 'st-clair' || value === 'woodbridge'
}

function isPersistedStoreKey(value: string | undefined): value is NonAggregateStoreKey {
  return value === 'st-clair' || value === 'woodbridge'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const storeKeyValue = searchParams.get('storeKey')
    const page = Number(searchParams.get('page') ?? '1')
    const limit = Number(searchParams.get('limit') ?? '30')
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    const payload = await listSalesFromDb({
      storeKey: isStoreKey(storeKeyValue) ? storeKeyValue : undefined,
      startDate: searchParams.get('startDate') ?? undefined,
      endDate: searchParams.get('endDate') ?? undefined,
      page,
      limit,
      sortOrder,
    })

    return NextResponse.json({ success: true, data: payload })
  } catch (error) {
    console.error('Failed to list sales', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch sales' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<DailySalesInput>

    if (!isPersistedStoreKey(body.storeKey)) {
      return NextResponse.json(
        { success: false, message: 'Invalid storeKey', errors: [{ field: 'storeKey', message: 'storeKey must be st-clair or woodbridge' }] },
        { status: 400 }
      )
    }

    if (!body.salesDate) {
      return NextResponse.json(
        { success: false, message: 'salesDate is required', errors: [{ field: 'salesDate', message: 'salesDate is required' }] },
        { status: 400 }
      )
    }

    const record = await upsertSaleInDb({
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
        isUpsert: true,
      },
    })
  } catch (error) {
    console.error('Failed to upsert sale', error)
    return NextResponse.json({ success: false, message: 'Failed to save sale' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryId = searchParams.get('id')
    let bodyId: string | undefined

    if (!queryId) {
      try {
        const body = (await request.json()) as { id?: string }
        bodyId = body.id
      } catch {
        bodyId = undefined
      }
    }

    const id = queryId ?? bodyId

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'id is required', errors: [{ field: 'id', message: 'id is required' }] },
        { status: 400 },
      )
    }

    const deleted = await deleteSaleInDb(id)

    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Sale record not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { id, deleted: true } })
  } catch (error) {
    console.error('Failed to delete sale', error)
    return NextResponse.json({ success: false, message: 'Failed to delete sale' }, { status: 500 })
  }
}
