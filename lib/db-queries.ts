import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { aiAnalysisReports, eventMasters, events, sales, stores } from '@/lib/schema'
import type {
  AIReport,
  CashAnalysisData,
  CashAnalysisDetail,
  CashAnalysisWindow,
  DailySalesInput,
  DashboardSummaryData,
  DashboardTrendData,
  HolidayComparisonData,
  HolidayListItem,
  HolidayRange,
  NonAggregateStoreKey,
  SaleRecord,
  SalesMode,
  SalesPeriod,
  StoreKey,
  StoreOption,
  UpcomingHoliday,
} from '@/lib/types'

const NET_RATIO = 0.85

function asNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function startOfDay(value: Date) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(value: Date, days: number) {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return startOfDay(date)
}

function toDateKey(value: Date | string) {
  return new Date(value).toISOString().split('T')[0]
}

function toDisplayLabel(dateValue: string, language: 'ko' | 'en') {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function isPersistedStoreKey(value: string): value is NonAggregateStoreKey {
  return value === 'st-clair' || value === 'woodbridge'
}

function toSaleRecord(row: {
  id: string
  storeKey: string
  salesDate: string
  cardSales: number | null
  cashSales: number | null
  uberEatsSales: number | null
  doordashSales: number | null
  cashAndCarrySales: number | null
  cardTip: number | null
  actualClosingCash: number | null
  totalSales: number | null
  netSales: number | null
  expectedCashAmount: number | null
  cashDifference: number | null
  note: string | null
}): SaleRecord {
  return {
    id: row.id,
    storeKey: isPersistedStoreKey(row.storeKey) ? row.storeKey : 'st-clair',
    salesDate: row.salesDate,
    cardSales: row.cardSales ?? 0,
    cashSales: row.cashSales ?? 0,
    uberEatsSales: row.uberEatsSales ?? 0,
    doorDashSales: row.doordashSales ?? 0,
    cashAndCarrySales: row.cashAndCarrySales ?? 0,
    tips: row.cardTip ?? 0,
    actualClosingCash: row.actualClosingCash ?? 0,
    totalSales: row.totalSales ?? 0,
    netSales: row.netSales ?? 0,
    expectedCash: row.expectedCashAmount ?? 0,
    cashDifference: row.cashDifference ?? 0,
    note: row.note ?? undefined,
  }
}

async function getStoreByKey(storeKey: NonAggregateStoreKey) {
  const [store] = await db.select().from(stores).where(eq(stores.key, storeKey)).limit(1)
  if (store) {
    return store
  }

  const defaultName = storeKey === 'st-clair' ? 'St. Clair' : 'Woodbridge'
  const defaultCode = storeKey === 'st-clair' ? 'KB-STC' : 'KB-WDB'

  const [createdStore] = await db
    .insert(stores)
    .values({
      key: storeKey,
      name: defaultName,
      code: defaultCode,
      timezone: 'America/Toronto',
      isActive: true,
    })
    .onConflictDoNothing()
    .returning()

  if (createdStore) {
    return createdStore
  }

  const [fallbackStore] = await db.select().from(stores).where(eq(stores.key, storeKey)).limit(1)
  return fallbackStore ?? null
}

async function getTotals(storeKey: StoreKey, startDate: string, endDate: string) {
  const [row] = await db
    .select({
      totalSales: sql<number>`coalesce(sum(${sales.totalSales}), 0)`,
      netSales: sql<number>`coalesce(sum(${sales.netSales}), 0)`,
      expectedCash: sql<number>`coalesce(sum(${sales.expectedCashAmount}), 0)`,
      actualCash: sql<number>`coalesce(sum(${sales.actualClosingCash}), 0)`,
    })
    .from(sales)
    .innerJoin(stores, eq(sales.storeId, stores.id))
    .where(and(
      gte(sales.salesDate, startDate),
      lte(sales.salesDate, endDate),
      ...(storeKey === 'all' ? [] : [eq(stores.key, storeKey)]),
    ))

  return {
    totalSales: asNumber(row?.totalSales),
    netSales: asNumber(row?.netSales),
    expectedCash: asNumber(row?.expectedCash),
    actualCash: asNumber(row?.actualCash),
  }
}

async function getDailyAggregates(storeKey: StoreKey, startDate: string, endDate: string) {
  const rows = await db
    .select({
      salesDate: sales.salesDate,
      totalSales: sql<number>`coalesce(sum(${sales.totalSales}), 0)`,
      netSales: sql<number>`coalesce(sum(${sales.netSales}), 0)`,
      expectedCash: sql<number>`coalesce(sum(${sales.expectedCashAmount}), 0)`,
      actualCash: sql<number>`coalesce(sum(${sales.actualClosingCash}), 0)`,
      difference: sql<number>`coalesce(sum(${sales.cashDifference}), 0)`,
    })
    .from(sales)
    .innerJoin(stores, eq(sales.storeId, stores.id))
    .where(and(
      gte(sales.salesDate, startDate),
      lte(sales.salesDate, endDate),
      ...(storeKey === 'all' ? [] : [eq(stores.key, storeKey)]),
    ))
    .groupBy(sales.salesDate)
    .orderBy(asc(sales.salesDate))

  return rows.map((row) => ({
    salesDate: row.salesDate,
    totalSales: asNumber(row.totalSales),
    netSales: asNumber(row.netSales),
    expectedCash: asNumber(row.expectedCash),
    actualCash: asNumber(row.actualCash),
    difference: asNumber(row.difference),
  }))
}

export async function getStoresFromDb(): Promise<StoreOption[]> {
  await Promise.all([
    getStoreByKey('st-clair'),
    getStoreByKey('woodbridge'),
  ])

  const rows = await db
    .select({ id: stores.id, key: stores.key, name: stores.name, code: stores.code })
    .from(stores)
    .where(inArray(stores.key, ['st-clair', 'woodbridge']))
    .orderBy(asc(stores.name))

  return rows
    .filter((row): row is { id: string; key: NonAggregateStoreKey; name: string; code: string | null } => isPersistedStoreKey(row.key))
    .map((row) => ({ id: row.id, key: row.key, name: row.name, code: row.code ?? '' }))
}

export async function listSalesFromDb(params: {
  storeKey?: StoreKey
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
  sortOrder?: 'asc' | 'desc'
}) {
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.max(1, params.limit ?? 30)
  const filters = []

  if (params.startDate) {
    filters.push(gte(sales.salesDate, params.startDate))
  }
  if (params.endDate) {
    filters.push(lte(sales.salesDate, params.endDate))
  }
  if ((params.storeKey ?? 'all') !== 'all') {
    filters.push(eq(stores.key, params.storeKey as NonAggregateStoreKey))
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sales)
    .innerJoin(stores, eq(sales.storeId, stores.id))
    .where(whereClause)

  const rows = await db
    .select({
      id: sales.id,
      storeKey: stores.key,
      salesDate: sales.salesDate,
      cardSales: sales.cardSales,
      cashSales: sales.cashSales,
      uberEatsSales: sales.uberEatsSales,
      doordashSales: sales.doordashSales,
      cashAndCarrySales: sales.cashAndCarrySales,
      cardTip: sales.cardTip,
      actualClosingCash: sales.actualClosingCash,
      totalSales: sales.totalSales,
      netSales: sales.netSales,
      expectedCashAmount: sales.expectedCashAmount,
      cashDifference: sales.cashDifference,
      note: sales.note,
    })
    .from(sales)
    .innerJoin(stores, eq(sales.storeId, stores.id))
    .where(whereClause)
    .orderBy(params.sortOrder === 'asc' ? asc(sales.salesDate) : desc(sales.salesDate))
    .limit(limit)
    .offset((page - 1) * limit)

  return {
    items: rows.map(toSaleRecord),
    pagination: {
      page,
      limit,
      total: countRow?.count ?? 0,
    },
  }
}

export async function upsertSaleInDb(input: DailySalesInput) {
  const store = await getStoreByKey(input.storeKey)

  if (!store) {
    throw new Error(`Store not found for key: ${input.storeKey}`)
  }

  const totalSales = input.cardSales + input.cashSales + input.uberEatsSales + input.doorDashSales + input.cashAndCarrySales
  const expectedCashAmount = input.cashSales
  const cashDifference = input.actualClosingCash - expectedCashAmount
  const netSales = Number((totalSales * NET_RATIO).toFixed(2))

  const [row] = await db
    .insert(sales)
    .values({
      storeId: store.id,
      salesDate: input.salesDate,
      cardSales: input.cardSales,
      cashSales: input.cashSales,
      uberEatsSales: input.uberEatsSales,
      doordashSales: input.doorDashSales,
      cashAndCarrySales: input.cashAndCarrySales,
      cardTip: input.tips,
      actualClosingCash: input.actualClosingCash,
      expectedCashAmount,
      cashDifference,
      totalSales,
      netSales,
      note: input.note,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [sales.storeId, sales.salesDate],
      set: {
        cardSales: input.cardSales,
        cashSales: input.cashSales,
        uberEatsSales: input.uberEatsSales,
        doordashSales: input.doorDashSales,
        cashAndCarrySales: input.cashAndCarrySales,
        cardTip: input.tips,
        actualClosingCash: input.actualClosingCash,
        expectedCashAmount,
        cashDifference,
        totalSales,
        netSales,
        note: input.note,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: sales.id,
      storeKey: sql<string>`${store.key}`,
      salesDate: sales.salesDate,
      cardSales: sales.cardSales,
      cashSales: sales.cashSales,
      uberEatsSales: sales.uberEatsSales,
      doordashSales: sales.doordashSales,
      cashAndCarrySales: sales.cashAndCarrySales,
      cardTip: sales.cardTip,
      actualClosingCash: sales.actualClosingCash,
      totalSales: sales.totalSales,
      netSales: sales.netSales,
      expectedCashAmount: sales.expectedCashAmount,
      cashDifference: sales.cashDifference,
      note: sales.note,
    })

  return {
    ...toSaleRecord(row),
    storeId: store.id,
  }
}

export async function getDashboardSummaryFromDb(params: {
  storeKey: StoreKey
  period: SalesPeriod
  salesMode: SalesMode
}): Promise<DashboardSummaryData> {
  const endDate = startOfDay(new Date())
  const dayCount = params.period === 'daily' ? 1 : params.period === 'weekly' ? 7 : 30
  const startDate = addDays(endDate, -(dayCount - 1))
  const previousStart = addDays(startDate, -dayCount)
  const previousEnd = addDays(startDate, -1)
  const current = await getTotals(params.storeKey, toDateKey(startDate), toDateKey(endDate))
  const previous = await getTotals(params.storeKey, toDateKey(previousStart), toDateKey(previousEnd))
  const currentComparable = params.salesMode === 'gross' ? current.totalSales : current.netSales
  const previousComparable = params.salesMode === 'gross' ? previous.totalSales : previous.netSales

  return {
    storeKey: params.storeKey,
    period: params.period,
    salesMode: params.salesMode,
    totalSales: current.totalSales,
    netSales: current.netSales,
    growthRate: previousComparable === 0 ? 0 : Number((((currentComparable - previousComparable) / previousComparable) * 100).toFixed(1)),
    previousPeriodSales: previousComparable,
  }
}

export async function getDashboardTrendsFromDb(params: {
  storeKey: StoreKey
  period: SalesPeriod
  salesMode: SalesMode
  language?: 'ko' | 'en'
}): Promise<DashboardTrendData> {
  const language = params.language ?? 'ko'
  const now = startOfDay(new Date())
  let labels: string[] = []
  let points: number[] = []

  if (params.period === 'daily') {
    const rows = await getDailyAggregates(params.storeKey, toDateKey(addDays(now, -6)), toDateKey(now))
    labels = rows.map((row) => toDisplayLabel(row.salesDate, language))
    points = rows.map((row) => (params.salesMode === 'gross' ? row.totalSales : row.netSales))
  } else if (params.period === 'weekly') {
    labels = language === 'ko' ? ['1주차', '2주차', '3주차', '4주차'] : ['W1', 'W2', 'W3', 'W4']
    points = await Promise.all(
      Array.from({ length: 4 }, async (_, index) => {
        const endDate = addDays(now, -(3 - index) * 7)
        const startDate = addDays(endDate, -6)
        const totals = await getTotals(params.storeKey, toDateKey(startDate), toDateKey(endDate))
        return params.salesMode === 'gross' ? totals.totalSales : totals.netSales
      })
    )
  } else {
    labels = Array.from({ length: 6 }, (_, index) => {
      const current = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      return current.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'short' })
    })
    points = await Promise.all(
      Array.from({ length: 6 }, async (_, index) => {
        const current = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
        const monthStart = startOfDay(current)
        const monthEnd = startOfDay(new Date(current.getFullYear(), current.getMonth() + 1, 0))
        const totals = await getTotals(params.storeKey, toDateKey(monthStart), toDateKey(monthEnd))
        return params.salesMode === 'gross' ? totals.totalSales : totals.netSales
      })
    )
  }

  return {
    labels,
    datasets: [{ name: params.salesMode === 'gross' ? 'Gross Sales' : 'Net Sales', type: 'line', data: points }],
    periodTotal: points.reduce((sum, point) => sum + point, 0),
  }
}

export async function getCashAnalysisFromDb(params: {
  storeKey: StoreKey
  periodDays?: number
  windowCount?: number
}): Promise<CashAnalysisData> {
  const periodDays = Math.max(1, params.periodDays ?? 14)
  const windowCount = Math.max(1, params.windowCount ?? 5)
  const anchorDate = startOfDay(new Date())
  const windows: CashAnalysisWindow[] = []

  for (let index = 0; index < windowCount; index += 1) {
    const endDate = addDays(anchorDate, -(index * periodDays))
    const startDate = addDays(endDate, -(periodDays - 1))
    const rows = await getDailyAggregates(params.storeKey, toDateKey(startDate), toDateKey(endDate))
    const details: CashAnalysisDetail[] = rows.map((row) => ({ date: row.salesDate, expected: row.expectedCash, actual: row.actualCash, difference: row.difference }))
    const expectedCash = details.reduce((sum, detail) => sum + detail.expected, 0)
    const actualCash = details.reduce((sum, detail) => sum + detail.actual, 0)
    const difference = actualCash - expectedCash
    const previousEndDate = addDays(startDate, -1)
    const previousStartDate = addDays(previousEndDate, -(periodDays - 1))
    const previous = await getTotals(params.storeKey, toDateKey(previousStartDate), toDateKey(previousEndDate))
    const vsPreviousAmount = actualCash - previous.actualCash

    windows.push({
      startDate: toDateKey(startDate),
      endDate: toDateKey(endDate),
      expectedCash,
      actualCash,
      difference,
      differenceRate: expectedCash === 0 ? 0 : Number(((difference / expectedCash) * 100).toFixed(1)),
      vsPreviousAmount,
      vsPreviousRate: previous.actualCash === 0 ? 0 : Number(((vsPreviousAmount / previous.actualCash) * 100).toFixed(1)),
      discrepancyCount: details.filter((detail) => detail.difference !== 0).length,
      negativeDiscrepancyCount: details.filter((detail) => detail.difference < 0).length,
      details,
    })
  }

  return {
    anchorDate: toDateKey(anchorDate),
    windows,
  }
}

export async function getHolidaysFromDb(): Promise<HolidayListItem[]> {
  const rows = await db.execute(sql`
    select
      em.id,
      em.name,
      extract(month from coalesce(min(case when e.event_date >= current_date then e.event_date end), min(e.event_date)))::int as month,
      extract(day from coalesce(min(case when e.event_date >= current_date then e.event_date end), min(e.event_date)))::int as day
    from event_masters em
    left join events e on e.event_master_id = em.id
    group by em.id, em.name
    order by em.name asc
  `)

  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    month: Number(row.month ?? 1),
    day: Number(row.day ?? 1),
  }))
}

export async function getUpcomingHolidaysFromDb(withinDays = 30): Promise<UpcomingHoliday[]> {
  const rows = await db.execute(sql`
    select distinct on (em.id)
      em.id,
      em.name,
      extract(month from e.event_date)::int as month,
      extract(day from e.event_date)::int as day,
      e.event_date as next_date
    from event_masters em
    join events e on e.event_master_id = em.id
    where e.event_date >= current_date
      and e.event_date <= current_date + (${withinDays} * interval '1 day')
    order by em.id, e.event_date asc
  `)

  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    month: Number(row.month),
    day: Number(row.day),
    nextDate: String(row.next_date),
  }))
}

export async function getHolidayComparisonFromDb(params: {
  holidayId: string
  storeKey: StoreKey
  range: HolidayRange
}): Promise<HolidayComparisonData | null> {
  const [holiday] = await db
    .select({ id: eventMasters.id, name: eventMasters.name })
    .from(eventMasters)
    .where(eq(eventMasters.id, params.holidayId))
    .limit(1)

  if (!holiday) {
    return null
  }

  const eventRows = await db
    .select({ eventDate: events.eventDate, year: events.year })
    .from(events)
    .where(eq(events.eventMasterId, params.holidayId))
    .orderBy(desc(events.year))

  if (eventRows.length === 0) {
    return {
      holiday: { id: holiday.id, name: holiday.name, month: 1, day: 1 },
      storeKey: params.storeKey,
      range: params.range,
      chart: { labels: [], data: [] },
      history: [],
    }
  }

  const salesRows = await db
    .select({ salesDate: sales.salesDate, totalSales: sql<number>`coalesce(sum(${sales.totalSales}), 0)` })
    .from(sales)
    .innerJoin(stores, eq(sales.storeId, stores.id))
    .where(and(
      inArray(sales.salesDate, eventRows.map((row) => row.eventDate)),
      ...(params.storeKey === 'all' ? [] : [eq(stores.key, params.storeKey)]),
    ))
    .groupBy(sales.salesDate)

  const salesByDate = new Map(salesRows.map((row) => [row.salesDate, row.totalSales]))
  const history = eventRows.map((row, index) => {
    const currentSales = salesByDate.get(row.eventDate) ?? 0
    const previousSales = index < eventRows.length - 1 ? salesByDate.get(eventRows[index + 1].eventDate) ?? 0 : 0

    return {
      year: row.year,
      date: row.eventDate,
      sales: currentSales,
      yoy: previousSales === 0 ? null : Number((((currentSales - previousSales) / previousSales) * 100).toFixed(1)),
    }
  })

  const rangeCount = params.range === '1y' ? 1 : params.range === '3y' ? 3 : 5
  const chartRows = [...history].slice(0, rangeCount).reverse()
  const [yearPart, monthPart, dayPart] = eventRows[0].eventDate.split('-')

  return {
    holiday: {
      id: holiday.id,
      name: holiday.name,
      month: Number(monthPart),
      day: Number(dayPart),
    },
    storeKey: params.storeKey,
    range: params.range,
    chart: {
      labels: chartRows.map((row) => String(row.year)),
      data: chartRows.map((row) => row.sales),
    },
    history,
  }
}

export async function createAiReportInDb(params: {
  storeKey: StoreKey
  startDate: string
  endDate: string
  analysisType: 'weekly' | 'monthly' | 'holiday' | 'cash_flow'
}): Promise<AIReport> {
  const totals = await getTotals(params.storeKey, params.startDate, params.endDate)
  const label = params.storeKey === 'all' ? '전체 지점' : params.storeKey === 'st-clair' ? 'St. Clair 지점' : 'Woodbridge 지점'
  const summary = `${label} 기준 ${params.analysisType} 분석 리포트입니다.\n\n• 기간: ${params.startDate} ~ ${params.endDate}\n• 총매출: ${Math.round(totals.totalSales).toLocaleString()}\n• 순매출: ${Math.round(totals.netSales).toLocaleString()}\n• 예상 현금 대비 실제 현금 차액: ${Math.round(totals.actualCash - totals.expectedCash).toLocaleString()}`
  const store = params.storeKey === 'all' ? null : await getStoreByKey(params.storeKey)

  const [report] = await db
    .insert(aiAnalysisReports)
    .values({
      storeId: store?.id ?? null,
      periodStart: params.startDate,
      periodEnd: params.endDate,
      reportType: params.analysisType.toUpperCase(),
      summary,
      insights: {
        totalSales: totals.totalSales,
        netSales: totals.netSales,
        actualCash: totals.actualCash,
        expectedCash: totals.expectedCash,
      },
      generatedByModel: 'GPT-5.4',
    })
    .returning({ reportId: aiAnalysisReports.id, createdAt: aiAnalysisReports.createdAt })

  return {
    reportId: report.reportId,
    summary,
    generatedAt: report.createdAt?.toISOString() ?? new Date().toISOString(),
  }
}