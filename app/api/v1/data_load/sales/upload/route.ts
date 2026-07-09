import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import { upsertSalesRestInDb } from '@/lib/db-queries'
import type { SalesRestInput } from '@/lib/types'

export const dynamic = 'force-dynamic'

// CSV 헤더 → SalesRestInput 필드 매핑
const COLUMN_MAP: Record<string, keyof SalesRestInput> = {
  sale_date: 'saleDate',
  day_of_week: 'dayOfWeek',
  gross_sale: 'grossSale',
  card_without_tips: 'cardWithoutTips',
  paid_out: 'paidOut',
  card_with_tips: 'cardWithTips',
  cash_sale: 'cashSale',
  ubereats_sale: 'ubereatsSale',
  doordash_sale: 'doordashSale',
  cash_and_carry: 'cashAndCarry',
  total_sale: 'totalSale',
  cash_expenses: 'cashExpenses',
  cash_left: 'cashLeft',
  actual_cash: 'actualCash',
  total_cash: 'totalCash',
  balance: 'balance',
  ubereats_fee: 'ubereatsFee',
  doordash_fee: 'doordashFee',
  total_commissions: 'totalCommissions',
  total_sale_after_commission: 'totalSaleAfterCommission',
}

const NULLABLE_FIELDS = new Set<keyof SalesRestInput>([
  'cashLeft',
  'actualCash',
  'totalCash',
  'balance',
])

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

function parseNumber(value: string | undefined | null): number {
  if (value === undefined || value === null || value.trim() === '') return 0
  const n = Number(value.trim())
  return Number.isFinite(n) ? n : 0
}

function parseNullableNumber(value: string | undefined | null): number | null {
  if (value === undefined || value === null || value.trim() === '') return null
  const n = Number(value.trim())
  return Number.isFinite(n) ? n : null
}

export async function POST(request: NextRequest) {
  // ── 1. multipart/form-data 파일 추출 ──────────────────────────────────────
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { success: false, message: '요청 파싱 실패: multipart/form-data 형식이어야 합니다.' },
      { status: 400 },
    )
  }

  const file = formData.get('file')
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { success: false, message: '파일이 없습니다. form-data의 "file" 필드로 CSV 파일을 전송하세요.' },
      { status: 400 },
    )
  }

  const fileName = file instanceof File ? file.name : 'upload'
  if (!fileName.toLowerCase().endsWith('.csv')) {
    return NextResponse.json(
      { success: false, message: `지원하지 않는 파일 형식입니다: "${fileName}". CSV 파일만 허용됩니다.` },
      { status: 400 },
    )
  }

  const maxBytes = 10 * 1024 * 1024 // 10 MB
  if (file.size > maxBytes) {
    return NextResponse.json(
      { success: false, message: `파일 크기가 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)} MB). 최대 10 MB까지 허용됩니다.` },
      { status: 400 },
    )
  }

  // ── 2. CSV 파싱 ────────────────────────────────────────────────────────────
  let csvText: string
  try {
    csvText = await file.text()
  } catch {
    return NextResponse.json(
      { success: false, message: '파일 읽기에 실패했습니다.' },
      { status: 500 },
    )
  }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  })

  if (parsed.errors.length > 0) {
    return NextResponse.json(
      {
        success: false,
        message: 'CSV 파싱 중 오류가 발생했습니다.',
        errors: parsed.errors.map((e) => ({
          row: e.row,
          code: e.code,
          message: e.message,
        })),
      },
      { status: 422 },
    )
  }

  if (!parsed.data || parsed.data.length === 0) {
    return NextResponse.json(
      { success: false, message: 'CSV 파일에 데이터 행이 없습니다.' },
      { status: 422 },
    )
  }

  // ── 3. 헤더 검증 ──────────────────────────────────────────────────────────
  const actualHeaders = Object.keys(parsed.data[0])
  const missingHeaders = Object.keys(COLUMN_MAP).filter((h) => !actualHeaders.includes(h))
  if (missingHeaders.length > 0) {
    return NextResponse.json(
      {
        success: false,
        message: '필수 컬럼이 누락되었습니다.',
        errors: missingHeaders.map((h) => ({ field: h, message: `컬럼 "${h}"이 없습니다.` })),
      },
      { status: 422 },
    )
  }

  // ── 4. 행별 변환 및 유효성 검사 ────────────────────────────────────────────
  type RowError = { row: number; field: string; message: string }
  const rowErrors: RowError[] = []
  const inputs: SalesRestInput[] = []

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i]
    const rowNum = i + 2 // 1-based + header row

    const saleDate = row['sale_date']?.trim() ?? ''
    if (!saleDate) {
      rowErrors.push({ row: rowNum, field: 'sale_date', message: '날짜가 비어 있습니다.' })
      continue
    }
    if (!DATE_REGEX.test(saleDate)) {
      rowErrors.push({ row: rowNum, field: 'sale_date', message: `날짜 형식이 올바르지 않습니다: "${saleDate}". YYYY-MM-DD 형식이어야 합니다.` })
      continue
    }

    const input: SalesRestInput = { saleDate }
    for (const [csvCol, field] of Object.entries(COLUMN_MAP)) {
      if (field === 'saleDate') continue
      if (field === 'dayOfWeek') {
        input.dayOfWeek = row[csvCol]?.trim() || undefined
        continue
      }
      if (NULLABLE_FIELDS.has(field)) {
        (input as Record<string, unknown>)[field] = parseNullableNumber(row[csvCol])
      } else {
        (input as Record<string, unknown>)[field] = parseNumber(row[csvCol])
      }
    }

    inputs.push(input)
  }

  if (rowErrors.length > 0) {
    return NextResponse.json(
      {
        success: false,
        message: `${rowErrors.length}개 행에서 유효성 오류가 발생했습니다. 저장이 취소됐습니다.`,
        errors: rowErrors,
      },
      { status: 422 },
    )
  }

  // ── 5. DB upsert (행별 실패 추적) ─────────────────────────────────────────
  type SaveError = { row: number; saleDate: string; message: string }
  const saveErrors: SaveError[] = []
  let savedCount = 0

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]
    try {
      await upsertSalesRestInDb(input)
      savedCount++
    } catch (err) {
      saveErrors.push({
        row: i + 2,
        saleDate: input.saleDate,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // ── 6. 응답 ───────────────────────────────────────────────────────────────
  if (saveErrors.length === 0) {
    return NextResponse.json({
      success: true,
      message: `총 ${savedCount}건의 데이터가 저장됐습니다.`,
      data: { savedCount, totalRows: inputs.length },
    })
  }

  // 일부 성공 / 일부 실패
  return NextResponse.json(
    {
      success: false,
      message: `${inputs.length}건 중 ${savedCount}건 저장 완료, ${saveErrors.length}건 저장 실패.`,
      data: { savedCount, failedCount: saveErrors.length, totalRows: inputs.length },
      errors: saveErrors,
    },
    { status: 207 },
  )
}
