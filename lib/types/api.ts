import type {
  AIReport,
  CashAnalysisData,
  DashboardSummaryData,
  DashboardTrendData,
  HolidayComparisonData,
  HolidayListItem,
  SaleRecord,
  SalesRestRecord,
  StoreOption,
  UpcomingHoliday,
} from '@/lib/types/domain'

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiValidationError {
  field?: string
  message: string
}

export interface ApiError {
  success: false
  message: string
  errors?: ApiValidationError[]
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export interface PaginationMeta {
  page: number
  limit: number
  total: number
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: PaginationMeta
}

export type StoresResponse = ApiSuccess<StoreOption[]>
export type SalesListResponse = ApiSuccess<PaginatedResponse<SaleRecord>>
export type SalesUpsertResponse = ApiSuccess<SaleRecord & { isUpsert: boolean }>
export type DashboardSummaryResponse = ApiSuccess<DashboardSummaryData>
export type DashboardTrendResponse = ApiSuccess<DashboardTrendData>
export type CashAnalysisResponse = ApiSuccess<CashAnalysisData>
export type HolidaysResponse = ApiSuccess<HolidayListItem[]>
export type UpcomingHolidaysResponse = ApiSuccess<UpcomingHoliday[]>
export type HolidayComparisonResponse = ApiSuccess<HolidayComparisonData>
export type AIAnalyzeResponse = ApiSuccess<AIReport>
export type SalesRestListResponse = ApiSuccess<PaginatedResponse<SalesRestRecord>>
export type SalesRestUpsertResponse = ApiSuccess<SalesRestRecord & { isUpsert: boolean }>
