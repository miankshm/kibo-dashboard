import type { ApiError, ApiResponse } from '@/lib/types'

function buildQuery(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return ''

  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    searchParams.set(key, String(value))
  }

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

export function buildApiUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  return `${path}${buildQuery(params)}`
}

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  const payload = (await response.json()) as ApiResponse<T>

  if (!response.ok || !payload.success) {
    const errorPayload = payload as ApiError
    throw new Error(errorPayload.message || 'Request failed')
  }

  return payload.data
}
