import { requestJson } from '@/lib/api/client'
import type { AIAnalyzeRequest, AIReport } from '@/lib/types'

export async function analyzeAIReport(input: AIAnalyzeRequest) {
  return requestJson<AIReport>('/api/v1/ai/analyze', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
