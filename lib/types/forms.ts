import type { NonAggregateStoreKey } from '@/lib/types/domain'

export interface DailySalesFormInput {
  storeId: NonAggregateStoreKey
  date: Date
  cardSales: number
  cashSales: number
  uberEatsSales: number
  doorDashSales: number
  cashAndCarrySales: number
  tips: number
  actualClosingCash: number
}

export interface DailySalesUpsertInput {
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

export interface AIAnalyzeRequest {
  storeKey: 'all' | NonAggregateStoreKey
  startDate: string
  endDate: string
  analysisType: 'weekly' | 'monthly' | 'holiday' | 'cash_flow'
}
