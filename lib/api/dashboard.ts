import { buildApiUrl, requestJson } from '@/lib/api/client'
import type { CashAnalysisData, DashboardSummaryData, DashboardTrendData, SalesMode, SalesPeriod, StoreKey } from '@/lib/types'

export async function getDashboardSummary(params: {
  storeKey: StoreKey
  period: SalesPeriod
  salesMode: SalesMode
}) {
  return requestJson<DashboardSummaryData>(buildApiUrl('/api/v1/dashboard/summary', params))
}

export async function getDashboardTrends(params: {
  storeKey: StoreKey
  period: SalesPeriod
  salesMode: SalesMode
  language?: 'ko' | 'en'
}) {
  return requestJson<DashboardTrendData>(buildApiUrl('/api/v1/dashboard/trends', params))
}

export async function getCashAnalysis(params: {
  storeKey: StoreKey
  periodDays?: number
  windowCount?: number
}) {
  return requestJson<CashAnalysisData>(buildApiUrl('/api/v1/dashboard/cash-analysis', params))
}
