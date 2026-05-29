import type {
  AIReport,
  CashAnalysisData,
  CashAnalysisDetail,
  CashAnalysisWindow,
  DashboardSummaryData,
  DashboardTrendData,
  DailySalesInput,
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

const DAY = 24 * 60 * 60 * 1000
const NET_RATIO = 0.85
const BASE_START_DATE = '2026-01-01'

const stores: StoreOption[] = [
  { id: 'store-kibo-north', key: 'kibo-north', name: 'Kibo Sushi North', code: 'KB-N01' },
  { id: 'store-kibo-south', key: 'kibo-south', name: 'Kibo Sushi South', code: 'KB-S01' },
]

const holidaySalesMap: Array<HolidayListItem & { salesByYear: Record<number, number> }> = [
  { id: 'holiday-new-year', name: "New Year's Day", month: 1, day: 1, salesByYear: { 2025: 8500, 2024: 7800, 2023: 7200, 2022: 6800, 2021: 6100 } },
  { id: 'holiday-valentine', name: "Valentine's Day", month: 2, day: 14, salesByYear: { 2025: 12300, 2024: 10500, 2023: 9800, 2022: 9200, 2021: 8700 } },
  { id: 'holiday-easter', name: 'Easter', month: 3, day: 31, salesByYear: { 2025: 6200, 2024: 5900, 2023: 5500, 2022: 5100, 2021: 4700 } },
  { id: 'holiday-mothers-day', name: "Mother's Day", month: 5, day: 12, salesByYear: { 2025: 15800, 2024: 14200, 2023: 12800, 2022: 11600, 2021: 10400 } },
  { id: 'holiday-fathers-day', name: "Father's Day", month: 6, day: 16, salesByYear: { 2025: 11200, 2024: 10800, 2023: 9900, 2022: 9300, 2021: 8600 } },
  { id: 'holiday-thanksgiving', name: 'Thanksgiving', month: 11, day: 28, salesByYear: { 2025: 0, 2024: 18500, 2023: 16800, 2022: 15400, 2021: 14600 } },
  { id: 'holiday-christmas', name: 'Christmas', month: 12, day: 25, salesByYear: { 2025: 0, 2024: 22000, 2023: 19500, 2022: 17900, 2021: 16500 } },
]

const holidayFactors: Record<NonAggregateStoreKey, number> = {
  'kibo-north': 1.08,
  'kibo-south': 0.92,
}

const salesOverrides = new Map<string, SaleRecord>()

function startOfDay(date: Date) {
  const nextDate = new Date(date)
  nextDate.setHours(0, 0, 0, 0)
  return nextDate
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function toDateKey(date: Date) {
  return startOfDay(date).toISOString().split('T')[0]
}

function parseDate(date: string) {
  return startOfDay(new Date(`${date}T00:00:00`))
}

function clampNonNegative(value: number) {
  return Math.max(0, Math.round(value))
}

function computeSaleRecord(input: DailySalesInput): SaleRecord {
  const totalSales =
    input.cardSales +
    input.cashSales +
    input.uberEatsSales +
    input.doorDashSales +
    input.cashAndCarrySales

  const expectedCash = input.cashSales
  const cashDifference = input.actualClosingCash - expectedCash

  return {
    ...input,
    id: `${input.storeKey}-${input.salesDate}`,
    totalSales,
    netSales: Math.round(totalSales * NET_RATIO),
    expectedCash,
    cashDifference,
  }
}

function generateBaseSale(date: Date, storeKey: NonAggregateStoreKey): SaleRecord {
  const dayOfWeek = date.getDay()
  const dateNum = date.getDate()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const storeSeed = storeKey === 'kibo-north' ? 17 : 31
  const storeFactor = storeKey === 'kibo-north' ? 1.06 : 0.94
  const seed = (dateNum * 137 + dayOfWeek * 41 + storeSeed + date.getMonth() * 23) % 100
  const baseTotal = Math.round((12500 + seed * 90) * (isWeekend ? 1.22 : 1.0) * storeFactor)

  const cardSales = clampNonNegative(baseTotal * 0.46)
  const cashSales = clampNonNegative(baseTotal * 0.17)
  const uberEatsSales = clampNonNegative(baseTotal * 0.16)
  const doorDashSales = clampNonNegative(baseTotal * 0.13)
  const cashAndCarrySales = clampNonNegative(baseTotal - cardSales - cashSales - uberEatsSales - doorDashSales)
  const tips = clampNonNegative(cardSales * 0.08)
  const closingDelta = ((seed % 9) - 4) * 18
  const actualClosingCash = clampNonNegative(cashSales + closingDelta)

  return computeSaleRecord({
    storeKey,
    salesDate: toDateKey(date),
    cardSales,
    cashSales,
    uberEatsSales,
    doorDashSales,
    cashAndCarrySales,
    tips,
    actualClosingCash,
  })
}

function getResolvedSale(date: Date, storeKey: NonAggregateStoreKey) {
  const key = `${storeKey}-${toDateKey(date)}`
  return salesOverrides.get(key) ?? generateBaseSale(date, storeKey)
}

function aggregateSales(date: string, entries: SaleRecord[]): SaleRecord {
  const totalSales = entries.reduce((sum, entry) => sum + entry.totalSales, 0)
  const cashSales = entries.reduce((sum, entry) => sum + entry.cashSales, 0)
  const actualClosingCash = entries.reduce((sum, entry) => sum + entry.actualClosingCash, 0)
  const expectedCash = entries.reduce((sum, entry) => sum + entry.expectedCash, 0)

  return {
    id: `all-${date}`,
    storeKey: 'kibo-north',
    salesDate: date,
    cardSales: entries.reduce((sum, entry) => sum + entry.cardSales, 0),
    cashSales,
    uberEatsSales: entries.reduce((sum, entry) => sum + entry.uberEatsSales, 0),
    doorDashSales: entries.reduce((sum, entry) => sum + entry.doorDashSales, 0),
    cashAndCarrySales: entries.reduce((sum, entry) => sum + entry.cashAndCarrySales, 0),
    tips: entries.reduce((sum, entry) => sum + entry.tips, 0),
    actualClosingCash,
    note: 'Aggregated view',
    totalSales,
    netSales: Math.round(totalSales * NET_RATIO),
    expectedCash,
    cashDifference: actualClosingCash - expectedCash,
  }
}

function getDateRange(startDate: Date, endDate: Date) {
  const dates: Date[] = []
  for (let current = startOfDay(startDate); current <= startOfDay(endDate); current = addDays(current, 1)) {
    dates.push(current)
  }
  return dates
}

function getCurrentDate() {
  return startOfDay(new Date())
}

function getStoreEntriesForRange(storeKey: StoreKey, startDate: Date, endDate: Date) {
  const dates = getDateRange(startDate, endDate)
  if (storeKey === 'all') {
    return dates.map((date) =>
      aggregateSales(toDateKey(date), [getResolvedSale(date, 'kibo-north'), getResolvedSale(date, 'kibo-south')])
    )
  }

  return dates.map((date) => getResolvedSale(date, storeKey))
}

function sortSales(entries: SaleRecord[], sortOrder: 'asc' | 'desc') {
  return [...entries].sort((left, right) =>
    sortOrder === 'asc'
      ? left.salesDate.localeCompare(right.salesDate)
      : right.salesDate.localeCompare(left.salesDate)
  )
}

function getWindowLabel(date: Date, language: 'ko' | 'en') {
  return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function getChangeSeed(date: Date, offset: number) {
  const raw = ((date.getDate() * 13 + date.getDay() * 7 + offset) % 26) - 10
  return Number((raw / 2).toFixed(1))
}

export function getStores() {
  return stores
}

export function upsertSale(input: DailySalesInput) {
  const record = computeSaleRecord(input)
  salesOverrides.set(record.id, record)
  return record
}

export function listSales(params: {
  storeKey?: StoreKey
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
  sortOrder?: 'asc' | 'desc'
}) {
  const now = getCurrentDate()
  const startDate = params.startDate ? parseDate(params.startDate) : parseDate(BASE_START_DATE)
  const endDate = params.endDate ? parseDate(params.endDate) : now
  const storeKey = params.storeKey ?? 'all'
  const page = params.page ?? 1
  const limit = params.limit ?? 30
  const sorted = sortSales(getStoreEntriesForRange(storeKey, startDate, endDate), params.sortOrder ?? 'desc')
  const offset = (page - 1) * limit

  return {
    items: sorted.slice(offset, offset + limit),
    pagination: {
      page,
      limit,
      total: sorted.length,
    },
  }
}

export function getDashboardSummary(params: {
  storeKey: StoreKey
  period: SalesPeriod
  salesMode: SalesMode
}): DashboardSummaryData {
  const endDate = getCurrentDate()
  const dayCount = params.period === 'daily' ? 1 : params.period === 'weekly' ? 7 : 30
  const startDate = addDays(endDate, -(dayCount - 1))
  const currentEntries = getStoreEntriesForRange(params.storeKey, startDate, endDate)
  const previousStart = addDays(startDate, -dayCount)
  const previousEnd = addDays(startDate, -1)
  const previousEntries = getStoreEntriesForRange(params.storeKey, previousStart, previousEnd)

  const currentTotal = currentEntries.reduce((sum, entry) => sum + (params.salesMode === 'gross' ? entry.totalSales : entry.netSales), 0)
  const previousTotal = previousEntries.reduce((sum, entry) => sum + (params.salesMode === 'gross' ? entry.totalSales : entry.netSales), 0)
  const growthRate = previousTotal === 0 ? 0 : Number((((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1))

  return {
    storeKey: params.storeKey,
    period: params.period,
    salesMode: params.salesMode,
    totalSales: currentEntries.reduce((sum, entry) => sum + entry.totalSales, 0),
    netSales: currentEntries.reduce((sum, entry) => sum + entry.netSales, 0),
    growthRate,
    previousPeriodSales: previousTotal,
  }
}

export function getDashboardTrends(params: {
  storeKey: StoreKey
  period: SalesPeriod
  salesMode: SalesMode
  language?: 'ko' | 'en'
}): DashboardTrendData {
  const language = params.language ?? 'ko'
  const now = getCurrentDate()
  let labels: string[] = []
  let points: number[] = []

  if (params.period === 'daily') {
    const entries = getStoreEntriesForRange(params.storeKey, addDays(now, -6), now)
    labels = entries.map((entry) => getWindowLabel(parseDate(entry.salesDate), language))
    points = entries.map((entry) => (params.salesMode === 'gross' ? entry.totalSales : entry.netSales))
  } else if (params.period === 'weekly') {
    const weekEntries = Array.from({ length: 4 }, (_, index) => {
      const endDate = addDays(now, -(3 - index) * 7)
      const startDate = addDays(endDate, -6)
      const entries = getStoreEntriesForRange(params.storeKey, startDate, endDate)
      return entries.reduce((sum, entry) => sum + (params.salesMode === 'gross' ? entry.totalSales : entry.netSales), 0)
    })
    labels = language === 'ko' ? ['1주차', '2주차', '3주차', '4주차'] : ['W1', 'W2', 'W3', 'W4']
    points = weekEntries
  } else {
    const monthEntries = Array.from({ length: 6 }, (_, index) => {
      const current = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      const monthStart = startOfDay(current)
      const monthEnd = startOfDay(new Date(current.getFullYear(), current.getMonth() + 1, 0))
      const entries = getStoreEntriesForRange(params.storeKey, monthStart, monthEnd)
      return entries.reduce((sum, entry) => sum + (params.salesMode === 'gross' ? entry.totalSales : entry.netSales), 0)
    })
    labels = Array.from({ length: 6 }, (_, index) => {
      const current = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      return current.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'short' })
    })
    points = monthEntries
  }

  return {
    labels,
    datasets: [
      {
        name: params.salesMode === 'gross' ? 'Gross Sales' : 'Net Sales',
        type: 'line',
        data: points,
      },
    ],
    periodTotal: points.reduce((sum, point) => sum + point, 0),
  }
}

export function getSalesCards(params: { storeKey: StoreKey; salesMode: SalesMode }) {
  const now = getCurrentDate()
  const entries = getStoreEntriesForRange(params.storeKey, addDays(now, -7), now)
  return entries.map((entry) => {
    const date = parseDate(entry.salesDate)
    const displayTotal = params.salesMode === 'gross' ? entry.totalSales : entry.netSales
    return {
      date: entry.salesDate,
      total: displayTotal,
      cards: [
        { key: 'storeVisits' as const, value: Math.round(displayTotal * 0.45), change: getChangeSeed(date, 11) },
        { key: 'cardSales' as const, value: Math.round(displayTotal * 0.35), change: getChangeSeed(date, 17) },
        { key: 'cashSales' as const, value: Math.round(displayTotal * 0.15), change: getChangeSeed(date, 23) },
        { key: 'deliverySales' as const, value: Math.round(displayTotal * 0.2), change: getChangeSeed(date, 29) },
      ],
    }
  })
}

export function getCashAnalysis(params: {
  storeKey: StoreKey
  periodDays?: number
  windowCount?: number
}): CashAnalysisData {
  const periodDays = params.periodDays ?? 14
  const windowCount = params.windowCount ?? 5
  const anchorDate = getCurrentDate()
  const windows: CashAnalysisWindow[] = []

  for (let index = 0; index < windowCount; index += 1) {
    const endDate = addDays(anchorDate, -(index * periodDays))
    const startDate = addDays(endDate, -(periodDays - 1))
    const entries = getStoreEntriesForRange(params.storeKey, startDate, endDate)
    const details: CashAnalysisDetail[] = entries.map((entry) => ({
      date: entry.salesDate,
      expected: entry.expectedCash,
      actual: entry.actualClosingCash,
      difference: entry.cashDifference,
    }))
    const expectedCash = details.reduce((sum, detail) => sum + detail.expected, 0)
    const actualCash = details.reduce((sum, detail) => sum + detail.actual, 0)
    const difference = actualCash - expectedCash

    const previousEndDate = addDays(startDate, -1)
    const previousStartDate = addDays(previousEndDate, -(periodDays - 1))
    const previousEntries = getStoreEntriesForRange(params.storeKey, previousStartDate, previousEndDate)
    const previousActual = previousEntries.reduce((sum, entry) => sum + entry.actualClosingCash, 0)
    const vsPreviousAmount = actualCash - previousActual
    const vsPreviousRate = previousActual === 0 ? 0 : Number(((vsPreviousAmount / previousActual) * 100).toFixed(1))

    windows.push({
      startDate: toDateKey(startDate),
      endDate: toDateKey(endDate),
      expectedCash,
      actualCash,
      difference,
      differenceRate: expectedCash === 0 ? 0 : Number(((difference / expectedCash) * 100).toFixed(1)),
      vsPreviousAmount,
      vsPreviousRate,
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

export function getHolidays() {
  return holidaySalesMap.map(({ salesByYear, ...holiday }) => holiday)
}

function getNextOccurrence(holiday: HolidayListItem, baseDate: Date) {
  const currentYear = baseDate.getFullYear()
  const thisYearDate = startOfDay(new Date(currentYear, holiday.month - 1, holiday.day))
  if (thisYearDate >= baseDate) return thisYearDate
  return startOfDay(new Date(currentYear + 1, holiday.month - 1, holiday.day))
}

export function getUpcomingHolidays(withinDays = 30): UpcomingHoliday[] {
  const today = getCurrentDate()
  const endDate = addDays(today, withinDays)
  return getHolidays()
    .map((holiday) => ({ ...holiday, nextDate: toDateKey(getNextOccurrence(holiday, today)) }))
    .filter((holiday) => parseDate(holiday.nextDate) <= endDate)
    .sort((left, right) => left.nextDate.localeCompare(right.nextDate))
}

export function getHolidayComparison(params: {
  holidayId: string
  storeKey: StoreKey
  range: HolidayRange
}): HolidayComparisonData {
  const holiday = holidaySalesMap.find((item) => item.id === params.holidayId) ?? holidaySalesMap[0]
  const yearsDesc = Object.keys(holiday.salesByYear).map(Number).sort((a, b) => b - a)
  const history = yearsDesc.map((year) => {
    const baseSales = holiday.salesByYear[year]
    let sales = baseSales
    if (params.storeKey === 'all') {
      sales = Math.round(baseSales * holidayFactors['kibo-north']) + Math.round(baseSales * holidayFactors['kibo-south'])
    } else {
      sales = Math.round(baseSales * holidayFactors[params.storeKey])
    }

    const previousYear = year - 1
    const previousBase = holiday.salesByYear[previousYear]
    let previousSales: number | null = null
    if (previousBase !== undefined) {
      previousSales = params.storeKey === 'all'
        ? Math.round(previousBase * holidayFactors['kibo-north']) + Math.round(previousBase * holidayFactors['kibo-south'])
        : Math.round(previousBase * holidayFactors[params.storeKey])
    }

    return {
      year,
      date: `${year}-${String(holiday.month).padStart(2, '0')}-${String(holiday.day).padStart(2, '0')}`,
      sales,
      yoy: previousSales && previousSales !== 0 ? Number((((sales - previousSales) / previousSales) * 100).toFixed(1)) : null,
    }
  })

  const latestYear = yearsDesc[0]
  const selectedYears = params.range === '1y'
    ? history.filter((row) => row.year === latestYear - 1 || row.year === latestYear).slice(0, 1)
    : history.slice(0, params.range === '3y' ? 3 : 5).sort((a, b) => a.year - b.year)

  return {
    holiday: { id: holiday.id, name: holiday.name, month: holiday.month, day: holiday.day },
    storeKey: params.storeKey,
    range: params.range,
    chart: {
      labels: selectedYears.map((row) => String(row.year)),
      data: selectedYears.map((row) => row.sales),
    },
    history,
  }
}

export function createAIReport(params: {
  storeKey: StoreKey
  startDate: string
  endDate: string
  analysisType: 'weekly' | 'monthly' | 'holiday' | 'cash_flow'
}): AIReport {
  const label = params.storeKey === 'all' ? '전체 지점' : params.storeKey === 'kibo-north' ? 'North 지점' : 'South 지점'
  const summary = `${label} 기준 ${params.analysisType} 분석 리포트입니다.\n\n• 기간: ${params.startDate} ~ ${params.endDate}\n• 총매출은 직전 비교 기간 대비 안정적인 상승 흐름을 보였습니다.\n• 카드 결제 비중이 가장 높고, 현금 차액은 관리 가능한 수준입니다.\n• Holiday/배달 채널 영향이 동반된 구간은 별도 마케팅 액션 후보입니다.`

  return {
    reportId: `report-${Date.now()}`,
    summary,
    generatedAt: new Date().toISOString(),
  }
}
