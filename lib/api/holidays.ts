import { buildApiUrl, requestJson } from '@/lib/api/client'
import type { HolidayComparisonData, HolidayListItem, HolidayRange, StoreKey, UpcomingHoliday } from '@/lib/types'

export async function getHolidayList() {
  return requestJson<HolidayListItem[]>('/api/v1/holidays')
}

export async function getUpcomingHolidayList(withinDays = 30) {
  return requestJson<UpcomingHoliday[]>(buildApiUrl('/api/v1/holidays/upcoming', { withinDays }))
}

export async function getHolidayComparison(params: {
  holidayId: string
  storeKey: StoreKey
  range: HolidayRange
}) {
  return requestJson<HolidayComparisonData>(buildApiUrl('/api/v1/holidays/comparison', params))
}
