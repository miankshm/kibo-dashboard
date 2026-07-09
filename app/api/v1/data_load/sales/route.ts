import { NextRequest, NextResponse } from 'next/server'
import { listSalesRestFromDb, upsertSalesRestInDb } from '@/lib/db-queries'
import type { SalesRestInput } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? '30')))
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
    const startDate = searchParams.get('startDate') ?? undefined
    const endDate = searchParams.get('endDate') ?? undefined

    const { items, total } = await listSalesRestFromDb({ startDate, endDate, page, limit, sortOrder })

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: { page, limit, total },
      },
    })
  } catch (error) {
    console.error('[GET /api/v1/data_load/sales]', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch sales_rest' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<SalesRestInput>

    if (!body.saleDate || typeof body.saleDate !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'saleDate is required',
          errors: [{ field: 'saleDate', message: 'saleDate must be a valid date string (YYYY-MM-DD)' }],
        },
        { status: 400 },
      )
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.saleDate)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid saleDate format',
          errors: [{ field: 'saleDate', message: 'saleDate must follow YYYY-MM-DD format' }],
        },
        { status: 400 },
      )
    }

    const input: SalesRestInput = {
      saleDate: body.saleDate,
      dayOfWeek: body.dayOfWeek,
      grossSale: Number(body.grossSale ?? 0),
      cardWithoutTips: Number(body.cardWithoutTips ?? 0),
      paidOut: Number(body.paidOut ?? 0),
      cardWithTips: Number(body.cardWithTips ?? 0),
      cashSale: Number(body.cashSale ?? 0),
      ubereatsSale: Number(body.ubereatsSale ?? 0),
      doordashSale: Number(body.doordashSale ?? 0),
      cashAndCarry: Number(body.cashAndCarry ?? 0),
      totalSale: Number(body.totalSale ?? 0),
      cashExpenses: Number(body.cashExpenses ?? 0),
      cashLeft: body.cashLeft != null ? Number(body.cashLeft) : null,
      actualCash: body.actualCash != null ? Number(body.actualCash) : null,
      totalCash: body.totalCash != null ? Number(body.totalCash) : null,
      balance: body.balance != null ? Number(body.balance) : null,
      ubereatsFee: Number(body.ubereatsFee ?? 0),
      doordashFee: Number(body.doordashFee ?? 0),
      totalCommissions: Number(body.totalCommissions ?? 0),
      totalSaleAfterCommission: Number(body.totalSaleAfterCommission ?? 0),
    }

    const record = await upsertSalesRestInDb(input)

    return NextResponse.json({ success: true, data: { ...record, isUpsert: true } })
  } catch (error) {
    console.error('[POST /api/v1/data_load/sales]', error)
    return NextResponse.json({ success: false, message: 'Failed to save sales_rest' }, { status: 500 })
  }
}
