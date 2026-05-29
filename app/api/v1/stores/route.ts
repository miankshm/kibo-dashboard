import { NextResponse } from 'next/server'
import { getStores } from '@/lib/mock-data'

export async function GET() {
  return NextResponse.json({
    success: true,
    data: getStores(),
  })
}
