'use client'

import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, ArrowUpDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/store/useStore'

// Mock 데이터 - 직전 14일 현금 흐름
const mockCashFlowData = [
  { date: '2024-01-01', expected: 1250, actual: 1230, diff: -20 },
  { date: '2024-01-02', expected: 980, actual: 995, diff: 15 },
  { date: '2024-01-03', expected: 1100, actual: 1085, diff: -15 },
  { date: '2024-01-04', expected: 1340, actual: 1340, diff: 0 },
  { date: '2024-01-05', expected: 1560, actual: 1520, diff: -40 },
  { date: '2024-01-06', expected: 1890, actual: 1910, diff: 20 },
  { date: '2024-01-07', expected: 1720, actual: 1700, diff: -20 },
  { date: '2024-01-08', expected: 1150, actual: 1165, diff: 15 },
  { date: '2024-01-09', expected: 1020, actual: 1010, diff: -10 },
  { date: '2024-01-10', expected: 1180, actual: 1190, diff: 10 },
  { date: '2024-01-11', expected: 1290, actual: 1275, diff: -15 },
  { date: '2024-01-12', expected: 1650, actual: 1680, diff: 30 },
  { date: '2024-01-13', expected: 2100, actual: 2050, diff: -50 },
  { date: '2024-01-14', expected: 1980, actual: 1995, diff: 15 },
]

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function formatCurrency(amount: number) {
  return `$${Math.abs(amount).toLocaleString()}`
}

export function CashFlowAnalysis() {
  const { selectedStoreId } = useStore()

  // 계산
  const totalExpected = mockCashFlowData.reduce((sum, d) => sum + d.expected, 0)
  const totalActual = mockCashFlowData.reduce((sum, d) => sum + d.actual, 0)
  const totalDiff = totalActual - totalExpected
  const diffPercentage = ((totalDiff / totalExpected) * 100).toFixed(2)

  // 차액 발생 건수
  const discrepancyCount = mockCashFlowData.filter((d) => d.diff !== 0).length
  const negativeDiscrepancyCount = mockCashFlowData.filter((d) => d.diff < 0).length

  // 이전 2주 대비 (mock)
  const previousPeriodDiff = -125
  const previousPeriodPercentage = 8.5

  return (
    <section id="cashflow" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">현금 유입 분석</h2>
        <p className="text-muted-foreground">
          직전 14일(2주) 단위 현금 흐름 분석 - {selectedStoreId === 'all' ? '전체 지점' : selectedStoreId}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">예상 현금</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpected)}</div>
            <p className="text-xs text-muted-foreground">현금결제 매출 기준</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">실제 마감 현금</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
            <p className="text-xs text-muted-foreground">actual_closing_cash 합계</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">차액</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalDiff >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalDiff >= 0 ? '+' : '-'}{formatCurrency(totalDiff)}
            </div>
            <div className={`flex items-center gap-1 text-xs ${totalDiff >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalDiff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{diffPercentage}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">전 2주 대비</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${previousPeriodDiff >= 0 ? 'text-success' : 'text-destructive'}`}>
              {previousPeriodDiff >= 0 ? '+' : ''}{formatCurrency(previousPeriodDiff)}
            </div>
            <div className={`flex items-center gap-1 text-xs ${previousPeriodDiff >= 0 ? 'text-success' : 'text-destructive'}`}>
              {previousPeriodDiff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{previousPeriodPercentage}% 개선</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>일별 현금 흐름 상세</CardTitle>
              <CardDescription>
                차액 발생: {discrepancyCount}건 중 마이너스 {negativeDiscrepancyCount}건
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {mockCashFlowData.map((item) => (
              <div
                key={item.date}
                className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium">{formatDate(item.date)}</div>
                  <div className="hidden sm:flex gap-4 text-sm text-muted-foreground">
                    <span>예상: {formatCurrency(item.expected)}</span>
                    <span>실제: {formatCurrency(item.actual)}</span>
                  </div>
                </div>
                <Badge
                  variant={item.diff === 0 ? 'secondary' : item.diff > 0 ? 'default' : 'destructive'}
                  className={item.diff > 0 ? 'bg-success text-success-foreground' : ''}
                >
                  {item.diff === 0 ? '일치' : item.diff > 0 ? `+${formatCurrency(item.diff)}` : `-${formatCurrency(item.diff)}`}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
