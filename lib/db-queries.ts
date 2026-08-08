import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { aiAnalysisReports, eventMasters, events, salesRecordsNew, stores } from '@/lib/schema'
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
  SalesRestInput,
  SalesRestRecord,
  StoreKey,
  StoreOption,
  UpcomingHoliday,
} from '@/lib/types'

const UBER_NET_RATIO = 0.77
const DOORDASH_NET_RATIO = 0.85

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
  const date = new Date(`${dateValue}T00:00:00`)
  const weekday = new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', {
    weekday: 'short',
  }).format(date)

  return `${weekday}(${date.getMonth() + 1}/${date.getDate()})`
}

function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return null
  }

  return Number((((current - previous) / previous) * 100).toFixed(1))
}

function formatPercent(value: number | null) {
  if (value === null) {
    return 'N/A'
  }

  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
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
      totalSales: sql<number>`coalesce(sum(${salesRecordsNew.totalSale}), 0)`,
      netSales: sql<number>`coalesce(sum(${salesRecordsNew.totalSaleAfterCommission}), 0)`,
      expectedCash: sql<number>`coalesce(sum(${salesRecordsNew.cashSaleInclGross} - ${salesRecordsNew.paidOut}), 0)`,
      actualCash: sql<number>`coalesce(sum(${salesRecordsNew.actualCash}), 0)`,
    })
    .from(salesRecordsNew)
    .innerJoin(stores, eq(salesRecordsNew.storeId, stores.id))
    .where(and(
      gte(salesRecordsNew.saleDate, startDate),
      lte(salesRecordsNew.saleDate, endDate),
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
      salesDate: salesRecordsNew.saleDate,
      totalSales: sql<number>`coalesce(sum(${salesRecordsNew.totalSale}), 0)`,
      netSales: sql<number>`coalesce(sum(${salesRecordsNew.totalSaleAfterCommission}), 0)`,
      expectedCash: sql<number>`coalesce(sum(${salesRecordsNew.cashSaleInclGross} - ${salesRecordsNew.paidOut}), 0)`,
      actualCash: sql<number>`coalesce(sum(${salesRecordsNew.actualCash}), 0)`,
      difference: sql<number>`coalesce(sum(${salesRecordsNew.balance}), 0)`,
    })
    .from(salesRecordsNew)
    .innerJoin(stores, eq(salesRecordsNew.storeId, stores.id))
    .where(and(
      gte(salesRecordsNew.saleDate, startDate),
      lte(salesRecordsNew.saleDate, endDate),
      ...(storeKey === 'all' ? [] : [eq(stores.key, storeKey)]),
    ))
    .groupBy(salesRecordsNew.saleDate)
    .orderBy(asc(salesRecordsNew.saleDate))

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
    filters.push(gte(salesRecordsNew.saleDate, params.startDate))
  }
  if (params.endDate) {
    filters.push(lte(salesRecordsNew.saleDate, params.endDate))
  }
  if ((params.storeKey ?? 'all') !== 'all') {
    filters.push(eq(stores.key, params.storeKey as NonAggregateStoreKey))
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(salesRecordsNew)
    .innerJoin(stores, eq(salesRecordsNew.storeId, stores.id))
    .where(whereClause)

  const rows = await db
    .select({
      id: salesRecordsNew.id,
      storeKey: stores.key,
      salesDate: salesRecordsNew.saleDate,
      cardSales: salesRecordsNew.cardWithoutTips,
      cashSales: salesRecordsNew.cashSaleInclGross,
      uberEatsSales: salesRecordsNew.ubereats,
      doordashSales: salesRecordsNew.doordash,
      cashAndCarrySales: salesRecordsNew.cashAndCarry,
      cardTip: salesRecordsNew.paidOut,
      actualClosingCash: salesRecordsNew.actualCash,
      totalSales: salesRecordsNew.totalSale,
      netSales: salesRecordsNew.totalSaleAfterCommission,
      expectedCashAmount: sql<number>`coalesce(${salesRecordsNew.cashSaleInclGross} - ${salesRecordsNew.paidOut}, 0)`,
      cashDifference: salesRecordsNew.balance,
      note: sql<string | null>`null`,
    })
    .from(salesRecordsNew)
    .innerJoin(stores, eq(salesRecordsNew.storeId, stores.id))
    .where(whereClause)
    .orderBy(params.sortOrder === 'asc' ? asc(salesRecordsNew.saleDate) : desc(salesRecordsNew.saleDate))
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
  if (!isPersistedStoreKey(input.storeKey)) {
    throw new Error(`Invalid persisted store key: ${input.storeKey}`)
  }

  const store = await getStoreByKey(input.storeKey)

  if (!store) {
    throw new Error(`Store not found for key: ${input.storeKey}`)
  }

  const totalSales = input.cardSales + input.cashSales + input.uberEatsSales + input.doorDashSales + input.cashAndCarrySales
  const expectedCashAmount = input.cashSales - input.tips
  const cashDifference = input.actualClosingCash - expectedCashAmount
  const netSales = Number((
    input.cardSales +
    input.cashSales +
    input.cashAndCarrySales +
    (input.uberEatsSales * UBER_NET_RATIO) +
    (input.doorDashSales * DOORDASH_NET_RATIO)
  ).toFixed(2))

  const ubereatsCommission = Number((input.uberEatsSales * (1 - UBER_NET_RATIO)).toFixed(2))
  const doordashCommission = Number((input.doorDashSales * (1 - DOORDASH_NET_RATIO)).toFixed(2))
  const totalCommissions = Number((ubereatsCommission + doordashCommission).toFixed(2))
  const ubereatsCommissionRate = input.uberEatsSales > 0 ? Number((ubereatsCommission / input.uberEatsSales).toFixed(6)) : 0
  const doordashCommissionRate = input.doorDashSales > 0 ? Number((doordashCommission / input.doorDashSales).toFixed(6)) : 0
  const dayOfWeek = new Date(`${input.salesDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })

  const [row] = await db
    .insert(salesRecordsNew)
    .values({
      storeId: store.id,
      saleDate: input.salesDate,
      dayOfWeek,
      grossSale: totalSales,
      cardWithoutTips: input.cardSales,
      paidOut: input.tips,
      cardWithTips: input.cardSales + input.tips,
      cashSaleInclGross: input.cashSales,
      ubereats: input.uberEatsSales,
      doordash: input.doorDashSales,
      cashAndCarry: input.cashAndCarrySales,
      totalSale: totalSales,
      cashExpenses: 0,
      cashLeft: expectedCashAmount,
      actualCash: input.actualClosingCash,
      totalCash: input.actualClosingCash,
      balance: cashDifference,
      ubereatsCommissionRate,
      ubereatsCommission,
      doordashCommissionRate,
      doordashCommission,
      totalCommissions,
      totalSaleAfterCommission: netSales,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [salesRecordsNew.storeId, salesRecordsNew.saleDate],
      set: {
        dayOfWeek,
        grossSale: totalSales,
        cardWithoutTips: input.cardSales,
        paidOut: input.tips,
        cardWithTips: input.cardSales + input.tips,
        cashSaleInclGross: input.cashSales,
        ubereats: input.uberEatsSales,
        doordash: input.doorDashSales,
        cashAndCarry: input.cashAndCarrySales,
        totalSale: totalSales,
        cashExpenses: 0,
        cashLeft: expectedCashAmount,
        actualCash: input.actualClosingCash,
        totalCash: input.actualClosingCash,
        balance: cashDifference,
        ubereatsCommissionRate,
        ubereatsCommission,
        doordashCommissionRate,
        doordashCommission,
        totalCommissions,
        totalSaleAfterCommission: netSales,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: salesRecordsNew.id,
      storeKey: sql<string>`${store.key}`,
      salesDate: salesRecordsNew.saleDate,
      cardSales: salesRecordsNew.cardWithoutTips,
      cashSales: salesRecordsNew.cashSaleInclGross,
      uberEatsSales: salesRecordsNew.ubereats,
      doordashSales: salesRecordsNew.doordash,
      cashAndCarrySales: salesRecordsNew.cashAndCarry,
      cardTip: salesRecordsNew.paidOut,
      actualClosingCash: salesRecordsNew.actualCash,
      totalSales: salesRecordsNew.totalSale,
      netSales: salesRecordsNew.totalSaleAfterCommission,
      expectedCashAmount: sql<number>`coalesce(${salesRecordsNew.cashSaleInclGross} - ${salesRecordsNew.paidOut}, 0)`,
      cashDifference: salesRecordsNew.balance,
      note: sql<string | null>`null`,
    })

  return {
    ...toSaleRecord(row),
    storeId: store.id,
  }
}

export async function deleteSaleInDb(id: string): Promise<boolean> {
  const rows = await db
    .delete(salesRecordsNew)
    .where(eq(salesRecordsNew.id, id))
    .returning({ id: salesRecordsNew.id })

  return rows.length > 0
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
    const daysFromMonday = (now.getDay() + 6) % 7
    const weekStart = addDays(now, -daysFromMonday)
    const rows = await getDailyAggregates(params.storeKey, toDateKey(weekStart), toDateKey(now))
    const valueByDate = new Map(
      rows.map((row) => [
        row.salesDate,
        params.salesMode === 'gross' ? row.totalSales : row.netSales,
      ])
    )

    const dailyDates = Array.from({ length: daysFromMonday + 1 }, (_, index) =>
      addDays(weekStart, index)
    )
    labels = dailyDates.map((date) => toDisplayLabel(toDateKey(date), language))
    points = dailyDates.map((date) => valueByDate.get(toDateKey(date)) ?? 0)
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
    .where(and(
      eq(events.eventMasterId, params.holidayId),
      sql`${events.eventDate} <= current_date`,
    ))
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
    .select({ salesDate: salesRecordsNew.saleDate, totalSales: sql<number>`coalesce(sum(${salesRecordsNew.totalSale}), 0)` })
    .from(salesRecordsNew)
    .innerJoin(stores, eq(salesRecordsNew.storeId, stores.id))
    .where(and(
      inArray(salesRecordsNew.saleDate, eventRows.map((row) => row.eventDate)),
      ...(params.storeKey === 'all' ? [] : [eq(stores.key, params.storeKey)]),
    ))
    .groupBy(salesRecordsNew.saleDate)

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
  const start = startOfDay(new Date(`${params.startDate}T00:00:00`))
  const end = startOfDay(new Date(`${params.endDate}T00:00:00`))
  const periodDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  const previousEnd = addDays(start, -1)
  const previousStart = addDays(previousEnd, -(periodDays - 1))
  const previousTotals = await getTotals(params.storeKey, toDateKey(previousStart), toDateKey(previousEnd))

  const [deliveryRow] = await db
    .select({
      uberEats: sql<number>`coalesce(sum(${salesRecordsNew.ubereats}), 0)`,
      doorDash: sql<number>`coalesce(sum(${salesRecordsNew.doordash}), 0)`,
      totalSales: sql<number>`coalesce(sum(${salesRecordsNew.totalSale}), 0)`,
    })
    .from(salesRecordsNew)
    .innerJoin(stores, eq(salesRecordsNew.storeId, stores.id))
    .where(and(
      gte(salesRecordsNew.saleDate, params.startDate),
      lte(salesRecordsNew.saleDate, params.endDate),
      ...(params.storeKey === 'all' ? [] : [eq(stores.key, params.storeKey)]),
    ))

  const dailyRows = await db
    .select({
      salesDate: salesRecordsNew.saleDate,
      totalSales: sql<number>`coalesce(sum(${salesRecordsNew.totalSale}), 0)`,
    })
    .from(salesRecordsNew)
    .innerJoin(stores, eq(salesRecordsNew.storeId, stores.id))
    .where(and(
      gte(salesRecordsNew.saleDate, params.startDate),
      lte(salesRecordsNew.saleDate, params.endDate),
      ...(params.storeKey === 'all' ? [] : [eq(stores.key, params.storeKey)]),
    ))
    .groupBy(salesRecordsNew.saleDate)

  const weekdayMap = new Map<string, number>()
  for (const row of dailyRows) {
    const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'long' }).format(new Date(`${row.salesDate}T00:00:00`))
    const current = weekdayMap.get(weekday) ?? 0
    weekdayMap.set(weekday, current + asNumber(row.totalSales))
  }

  const weekdayStats = Array.from(weekdayMap.entries())
    .map(([weekday, amount]) => ({
      weekday,
      amount,
      ratio: totals.totalSales === 0 ? 0 : Number(((amount / totals.totalSales) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.amount - a.amount)

  const topWeekday = weekdayStats[0] ?? null
  const lowWeekday = weekdayStats.length > 0 ? weekdayStats[weekdayStats.length - 1] : null

  const uberEatsSales = asNumber(deliveryRow?.uberEats)
  const doorDashSales = asNumber(deliveryRow?.doorDash)
  const deliveryTotalSales = uberEatsSales + doorDashSales
  const uberShare = totals.totalSales === 0 ? 0 : Number(((uberEatsSales / totals.totalSales) * 100).toFixed(1))
  const doorDashShare = totals.totalSales === 0 ? 0 : Number(((doorDashSales / totals.totalSales) * 100).toFixed(1))
  const deliveryShare = totals.totalSales === 0 ? 0 : Number(((deliveryTotalSales / totals.totalSales) * 100).toFixed(1))
  const platformFeeImpact = Number(((uberEatsSales * (1 - UBER_NET_RATIO)) + (doorDashSales * (1 - DOORDASH_NET_RATIO))).toFixed(2))
  const deliveryNetAfterFee = Number(((uberEatsSales * UBER_NET_RATIO) + (doorDashSales * DOORDASH_NET_RATIO)).toFixed(2))

  const totalSalesGrowthRate = percentChange(totals.totalSales, previousTotals.totalSales)
  const netSalesGrowthRate = percentChange(totals.netSales, previousTotals.netSales)
  const insights = {
    totalSales: totals.totalSales,
    netSales: totals.netSales,
    actualCash: totals.actualCash,
    expectedCash: totals.expectedCash,
    totalSalesGrowthRate,
    netSalesGrowthRate,
    topWeekday,
    lowWeekday,
    weekdayDistribution: weekdayStats,
    delivery: {
      uberEatsSales,
      doorDashSales,
      deliveryTotalSales,
      uberShare,
      doorDashShare,
      deliveryShare,
      platformFeeImpact,
      deliveryNetAfterFee,
    },
  }
  const label = params.storeKey === 'all' ? '전체 지점' : params.storeKey === 'st-clair' ? 'St. Clair 지점' : 'Woodbridge 지점'
  const summary = `${label} 기준 ${params.analysisType} 분석 리포트입니다.\n\n[매출 요약]\n• 기간: ${params.startDate} ~ ${params.endDate}\n• 총매출: ${Math.round(totals.totalSales).toLocaleString()}\n• 순매출: ${Math.round(totals.netSales).toLocaleString()}\n• 전주 대비 총매출 증감률: ${formatPercent(totalSalesGrowthRate)}\n• 전주 대비 순매출 증감률: ${formatPercent(netSalesGrowthRate)}\n\n[요일 분석]\n• 최고 매출 요일: ${topWeekday ? `${topWeekday.weekday} (${Math.round(topWeekday.amount).toLocaleString()}, ${topWeekday.ratio}%)` : '데이터 없음'}\n• 최저 매출 요일: ${lowWeekday ? `${lowWeekday.weekday} (${Math.round(lowWeekday.amount).toLocaleString()}, ${lowWeekday.ratio}%)` : '데이터 없음'}\n• 요일별 매출 비중: ${weekdayStats.length > 0 ? weekdayStats.map((item) => `${item.weekday} ${item.ratio}%`).join(', ') : '데이터 없음'}\n\n[배달앱 분석]\n• Uber Eats 매출 비중: ${uberShare}%\n• DoorDash 매출 비중: ${doorDashShare}%\n• 배달앱 전체 매출 비중: ${deliveryShare}%\n• 플랫폼 수수료 영향(총): ${Math.round(platformFeeImpact).toLocaleString()}\n• 수수료 반영 후 배달앱 순매출: ${Math.round(deliveryNetAfterFee).toLocaleString()} (Uber 23%, DoorDash 15%)\n\n• 예상 현금 대비 실제 현금 차액: ${Math.round(totals.actualCash - totals.expectedCash).toLocaleString()}`
  const store = params.storeKey === 'all' ? null : await getStoreByKey(params.storeKey)

  const [report] = await db
    .insert(aiAnalysisReports)
    .values({
      storeId: store?.id ?? null,
      periodStart: params.startDate,
      periodEnd: params.endDate,
      reportType: params.analysisType.toUpperCase(),
      summary,
      insights,
      generatedByModel: 'GPT-5.4',
    })
    .returning({ reportId: aiAnalysisReports.id, createdAt: aiAnalysisReports.createdAt })

  return {
    reportId: report.reportId,
    summary,
    generatedAt: report.createdAt?.toISOString() ?? new Date().toISOString(),
    insights,
  }
}

// ─── sales_rest ────────────────────────────────────────────────────────────────

function toSalesRestRecord(row: typeof salesRecordsNew.$inferSelect): SalesRestRecord {
  return {
    id: row.id,
    saleDate: row.saleDate,
    dayOfWeek: row.dayOfWeek ?? '',
    grossSale: asNumber(row.grossSale),
    cardWithoutTips: asNumber(row.cardWithoutTips),
    paidOut: asNumber(row.paidOut),
    cardWithTips: asNumber(row.cardWithTips),
    cashSale: asNumber(row.cashSaleInclGross),
    ubereatsSale: asNumber(row.ubereats),
    doordashSale: asNumber(row.doordash),
    cashAndCarry: asNumber(row.cashAndCarry),
    totalSale: asNumber(row.totalSale),
    cashExpenses: asNumber(row.cashExpenses),
    cashLeft: asNumber(row.cashLeft),
    actualCash: asNumber(row.actualCash),
    totalCash: asNumber(row.totalCash),
    balance: asNumber(row.balance),
    ubereatsFee: asNumber(row.ubereatsCommission),
    doordashFee: asNumber(row.doordashCommission),
    totalCommissions: asNumber(row.totalCommissions),
    totalSaleAfterCommission: asNumber(row.totalSaleAfterCommission),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
    createdAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  }
}

export async function listSalesRestFromDb(params: {
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
  sortOrder?: 'asc' | 'desc'
}): Promise<{ items: SalesRestRecord[]; total: number }> {
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(200, Math.max(1, params.limit ?? 30))
  const offset = (page - 1) * limit
  const order = params.sortOrder === 'asc' ? asc(salesRecordsNew.saleDate) : desc(salesRecordsNew.saleDate)
  const stClairStore = await getStoreByKey('st-clair')

  if (!stClairStore) {
    throw new Error('Store not found for key: st-clair')
  }

  const conditions = [
    eq(salesRecordsNew.storeId, stClairStore.id),
    params.startDate ? gte(salesRecordsNew.saleDate, params.startDate) : undefined,
    params.endDate ? lte(salesRecordsNew.saleDate, params.endDate) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition))

  const [rows, [countRow]] = await Promise.all([
    db
      .select()
      .from(salesRecordsNew)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(order)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(salesRecordsNew)
      .where(conditions.length ? and(...conditions) : undefined),
  ])

  return {
    items: rows.map(toSalesRestRecord),
    total: countRow?.count ?? 0,
  }
}

export async function upsertSalesRestInDb(input: SalesRestInput): Promise<SalesRestRecord> {
  const stClairStore = await getStoreByKey('st-clair')

  if (!stClairStore) {
    throw new Error('Store not found for key: st-clair')
  }

  const ubereatsCommission = input.ubereatsFee ?? 0
  const doordashCommission = input.doordashFee ?? 0
  const ubereatsCommissionRate = (input.ubereatsSale ?? 0) > 0 ? Number((ubereatsCommission / (input.ubereatsSale ?? 0)).toFixed(6)) : 0
  const doordashCommissionRate = (input.doordashSale ?? 0) > 0 ? Number((doordashCommission / (input.doordashSale ?? 0)).toFixed(6)) : 0

  const [row] = await db
    .insert(salesRecordsNew)
    .values({
      storeId: stClairStore.id,
      saleDate: input.saleDate,
      dayOfWeek: input.dayOfWeek ?? null,
      grossSale: input.grossSale ?? 0,
      cardWithoutTips: input.cardWithoutTips ?? 0,
      paidOut: input.paidOut ?? 0,
      cardWithTips: input.cardWithTips ?? 0,
      cashSaleInclGross: input.cashSale ?? 0,
      ubereats: input.ubereatsSale ?? 0,
      doordash: input.doordashSale ?? 0,
      cashAndCarry: input.cashAndCarry ?? 0,
      totalSale: input.totalSale ?? 0,
      cashExpenses: input.cashExpenses ?? 0,
      cashLeft: input.cashLeft ?? 0,
      actualCash: input.actualCash ?? 0,
      totalCash: input.totalCash ?? 0,
      balance: input.balance ?? 0,
      ubereatsCommissionRate,
      ubereatsCommission,
      doordashCommissionRate,
      doordashCommission,
      totalCommissions: input.totalCommissions ?? 0,
      totalSaleAfterCommission: input.totalSaleAfterCommission ?? 0,
    })
    .onConflictDoUpdate({
      target: [salesRecordsNew.storeId, salesRecordsNew.saleDate],
      set: {
        dayOfWeek: sql`excluded.day_of_week`,
        grossSale: sql`excluded.gross_sale`,
        cardWithoutTips: sql`excluded.card_without_tips`,
        paidOut: sql`excluded.paid_out`,
        cardWithTips: sql`excluded.card_with_tips`,
        cashSaleInclGross: sql`excluded.cash_sale_incl_gross`,
        ubereats: sql`excluded.ubereats`,
        doordash: sql`excluded.doordash`,
        cashAndCarry: sql`excluded.cash_and_carry`,
        totalSale: sql`excluded.total_sale`,
        cashExpenses: sql`excluded.cash_expenses`,
        cashLeft: sql`excluded.cash_left`,
        actualCash: sql`excluded.actual_cash`,
        totalCash: sql`excluded.total_cash`,
        balance: sql`excluded.balance`,
        ubereatsCommissionRate: sql`excluded.ubereats_commission_rate`,
        ubereatsCommission: sql`excluded.ubereats_commission`,
        doordashCommissionRate: sql`excluded.doordash_commission_rate`,
        doordashCommission: sql`excluded.doordash_commission`,
        totalCommissions: sql`excluded.total_commissions`,
        totalSaleAfterCommission: sql`excluded.total_sale_after_commission`,
        updatedAt: sql`now()`,
      },
    })
    .returning()

  return toSalesRestRecord(row)
}