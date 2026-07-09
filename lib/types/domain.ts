export type StoreKey = 'all' | 'st-clair' | 'woodbridge'
export type NonAggregateStoreKey = Exclude<StoreKey, 'all'>
export type SalesPeriod = 'daily' | 'weekly' | 'monthly'
export type SalesMode = 'gross' | 'net'
export type HolidayRange = '1y' | '3y' | '5y'

export interface StoreOption {
  id: string
  key: NonAggregateStoreKey
  name: string
  code: string
}

export interface DailySalesInput {
  storeKey: NonAggregateStoreKey
  salesDate: string
  cardSales: number
  cashSales: number
  uberEatsSales: number
  doorDashSales: number
  cashAndCarrySales: number
  tips: number
  actualClosingCash: number
  note?: string
}

export interface SaleRecord extends DailySalesInput {
  id: string
  totalSales: number
  netSales: number
  expectedCash: number
  cashDifference: number
}

export interface SalesMetricCard {
  key: 'storeVisits' | 'cardSales' | 'cashSales' | 'deliverySales'
  value: number
  change: number
}

export interface DashboardSummaryData {
  storeKey: StoreKey
  period: SalesPeriod
  salesMode: SalesMode
  totalSales: number
  netSales: number
  growthRate: number
  previousPeriodSales: number
}

export interface TrendDataset {
  name: string
  type: 'line' | 'bar'
  data: number[]
}

export interface DashboardTrendData {
  labels: string[]
  datasets: TrendDataset[]
  periodTotal: number
}

export interface CashAnalysisDetail {
  date: string
  expected: number
  actual: number
  difference: number
}

export interface CashAnalysisWindow {
  startDate: string
  endDate: string
  expectedCash: number
  actualCash: number
  difference: number
  differenceRate: number
  vsPreviousAmount: number
  vsPreviousRate: number
  discrepancyCount: number
  negativeDiscrepancyCount: number
  details: CashAnalysisDetail[]
}

export interface CashAnalysisData {
  anchorDate: string
  windows: CashAnalysisWindow[]
}

export interface HolidayListItem {
  id: string
  name: string
  month: number
  day: number
}

export interface UpcomingHoliday extends HolidayListItem {
  nextDate: string
}

export interface HolidayHistoryRow {
  year: number
  date: string
  sales: number
  yoy: number | null
}

export interface HolidayComparisonData {
  holiday: HolidayListItem
  storeKey: StoreKey
  range: HolidayRange
  chart: {
    labels: string[]
    data: number[]
  }
  history: HolidayHistoryRow[]
}

export interface AIReport {
  reportId: string
  summary: string
  generatedAt: string
  insights?: AIReportInsights
}

export interface AIWeekdayStat {
  weekday: string
  amount: number
  ratio: number
}

export interface AIDeliveryInsights {
  uberEatsSales: number
  doorDashSales: number
  deliveryTotalSales: number
  uberShare: number
  doorDashShare: number
  deliveryShare: number
  platformFeeImpact: number
  deliveryNetAfterFee: number
}

export interface AIReportInsights {
  totalSales: number
  netSales: number
  actualCash: number
  expectedCash: number
  totalSalesGrowthRate: number | null
  netSalesGrowthRate: number | null
  topWeekday: AIWeekdayStat | null
  lowWeekday: AIWeekdayStat | null
  weekdayDistribution: AIWeekdayStat[]
  delivery: AIDeliveryInsights
}

export interface SalesRestInput {
  saleDate: string
  dayOfWeek?: string
  grossSale?: number
  cardWithoutTips?: number
  paidOut?: number
  cardWithTips?: number
  cashSale?: number
  ubereatsSale?: number
  doordashSale?: number
  cashAndCarry?: number
  totalSale?: number
  cashExpenses?: number
  cashLeft?: number | null
  actualCash?: number | null
  totalCash?: number | null
  balance?: number | null
  ubereatsFee?: number
  doordashFee?: number
  totalCommissions?: number
  totalSaleAfterCommission?: number
}

export interface SalesRestRecord extends Required<SalesRestInput> {
  id: string
  createdAt: string
  updatedAt: string
}
