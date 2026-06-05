import { NextResponse } from 'next/server'
import { getStoresFromDb } from '@/lib/db-queries'

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: await getStoresFromDb(),
    })
  } catch (error) {
    console.error('Failed to fetch stores', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch stores' }, { status: 500 })
  }
}
