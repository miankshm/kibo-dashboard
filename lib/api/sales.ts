import { buildApiUrl, requestJson } from '@/lib/api/client'
import type { DailySalesUpsertInput, PaginatedResponse, SaleRecord, StoreKey } from '@/lib/types'

export async function upsertDailySales(input: DailySalesUpsertInput) {
  return requestJson<SaleRecord & { isUpsert: boolean }>('/api/v1/sales', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getSalesList(params: {
  storeKey?: StoreKey
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
  sortOrder?: 'asc' | 'desc'
}) {
  return requestJson<PaginatedResponse<SaleRecord>>(buildApiUrl('/api/v1/sales', params))
}

export async function deleteSalesRecord(id: string) {
  return requestJson<{ id: string; deleted: boolean }>(buildApiUrl('/api/v1/sales', { id }), {
    method: 'DELETE',
  })
}
