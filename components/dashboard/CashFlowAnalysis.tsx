'use client'

import { useEffect, useMemo, useState } from 'react'
import type { UseEmblaCarouselType } from 'embla-carousel-react'
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, ArrowUpDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel'
import { useWorkflow } from '@/contexts/workflow-context'
import { useStore } from '@/store/useStore'
import { getTranslation } from '@/lib/i18n'

type CarouselApi = UseEmblaCarouselType[1]

type CashFlowEntry = {
  date: Date
  expected: number
  actual: number
}

type CashFlowPeriod = {
  start: Date
  end: Date
  entries: CashFlowEntry[]
  totalExpected: number
  totalActual: number
  totalDiff: number
  discrepancyCount: number
  negativeDiscrepancyCount: number
}

const PERIOD_COUNT = 5
const PERIOD_LENGTH_DAYS = 14
const DEFAULT_REFERENCE_DATE = new Date(2026, 4, 10)

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

function getDateKey(date: Date) {
  return date.toISOString().split('T')[0]
}

function formatCurrency(amount: number) {
  return `$${Math.abs(Math.round(amount)).toLocaleString()}`
}

function formatRange(start: Date, end: Date, language: 'ko' | 'en') {
  const locale = language === 'ko' ? 'ko-KR' : 'en-US'
  const startLabel = start.toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
  })
  const endLabel = end.toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return `${startLabel} - ${endLabel}`
}

function generateSampleEntries(endDate: Date, scope: 'all' | 'kibo-north' | 'kibo-south'): CashFlowEntry[] {
  const factor = scope === 'all' ? 2.0 : scope === 'kibo-north' ? 1.08 : 0.92
  const seedOffset = scope === 'all' ? 23 : scope === 'kibo-north' ? 11 : 37

  return Array.from({ length: PERIOD_LENGTH_DAYS }, (_, index) => {
    const date = addDays(endDate, -(PERIOD_LENGTH_DAYS - 1 - index))
    const daySeed = date.getDate() * 37 + date.getMonth() * 19 + date.getDay() * 11 + seedOffset
    const expected = Math.round((900 + (daySeed % 850)) * factor)
    const actual = expected + ((daySeed % 9) - 4) * 15

    return {
      date: startOfDay(date),
      expected,
      actual,
    }
  })
}

export function CashFlowAnalysis() {
  const { dailySalesEntries } = useWorkflow()
  const { selectedStoreId, language } = useStore()
  const text = getTranslation(language)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [currentIndex, setCurrentIndex] = useState(0)

  const scopedEntries = useMemo(() => {
    if (selectedStoreId === 'all') return dailySalesEntries
    return dailySalesEntries.filter((entry) => entry.storeId === selectedStoreId)
  }, [dailySalesEntries, selectedStoreId])

  const anchorDate = useMemo(() => {
    if (scopedEntries.length === 0) {
      return startOfDay(DEFAULT_REFERENCE_DATE)
    }

    return scopedEntries.reduce((latest, entry) => {
      if (!entry.date) return latest
      return entry.date > latest ? entry.date : latest
    }, startOfDay(scopedEntries[0].date ?? DEFAULT_REFERENCE_DATE))
  }, [scopedEntries])

  const cashFlowEntries = useMemo(() => {
    const sampleEntries = generateSampleEntries(anchorDate, selectedStoreId)
    const entryMap = new Map(sampleEntries.map((entry) => [getDateKey(entry.date), entry]))

    scopedEntries.forEach((entry) => {
      if (!entry.date) return
      entryMap.set(getDateKey(entry.date), {
        date: startOfDay(entry.date),
        expected: entry.cashSales,
        actual: entry.actualClosingCash,
      })
    })

    return Array.from(entryMap.values()).sort((left, right) => left.date.getTime() - right.date.getTime())
  }, [anchorDate, scopedEntries, selectedStoreId])

  const periods = useMemo(() => {
    return Array.from({ length: PERIOD_COUNT }, (_, index) => {
      const periodEnd = startOfDay(addDays(anchorDate, -(index * PERIOD_LENGTH_DAYS)))
      const periodStart = startOfDay(addDays(periodEnd, -(PERIOD_LENGTH_DAYS - 1)))
      const entries = cashFlowEntries.filter(
        (entry) => entry.date >= periodStart && entry.date <= periodEnd
      )

      const totalExpected = entries.reduce((sum, entry) => sum + entry.expected, 0)
      const totalActual = entries.reduce((sum, entry) => sum + entry.actual, 0)
      const totalDiff = totalActual - totalExpected
      const discrepancyCount = entries.filter((entry) => entry.actual !== entry.expected).length
      const negativeDiscrepancyCount = entries.filter((entry) => entry.actual < entry.expected).length

      return {
        start: periodStart,
        end: periodEnd,
        entries,
        totalExpected,
        totalActual,
        totalDiff,
        discrepancyCount,
        negativeDiscrepancyCount,
      }
    })
  }, [anchorDate, cashFlowEntries])

  const currentPeriod = periods[currentIndex] ?? periods[0]
  const previousPeriod = periods[currentIndex + 1]
  const previousPeriodDiff = previousPeriod ? currentPeriod.totalActual - previousPeriod.totalActual : 0
  const previousPeriodPercentage = previousPeriod?.totalActual
    ? ((previousPeriodDiff / previousPeriod.totalActual) * 100).toFixed(1)
    : '0.0'

  useEffect(() => {
    setCurrentIndex(0)
    carouselApi?.scrollTo(0, true)
  }, [anchorDate, carouselApi])

  useEffect(() => {
    if (!carouselApi) return

    const onSelect = () => setCurrentIndex(carouselApi.selectedScrollSnap())
    carouselApi.on('select', onSelect)
    onSelect()

    return () => {
      carouselApi.off('select', onSelect)
    }
  }, [carouselApi])

  return (
    <section id="cashflow" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{text.cashFlow.title}</h2>
        <p className="text-muted-foreground">
          {formatRange(currentPeriod.start, currentPeriod.end, language)}
        </p>
      </div>

      <div className="relative px-10">
        <Carousel setApi={setCarouselApi} opts={{ startIndex: 0 }}>
          <CarouselContent>
            {periods.map((period) => (
              <CarouselItem key={`${getDateKey(period.start)}-${getDateKey(period.end)}`}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{text.cashFlow.expectedCash}</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(period.totalExpected)}</div>
                      <p className="text-xs text-muted-foreground">{text.cashFlow.expectedCashNote}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{text.cashFlow.actualCash}</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(period.totalActual)}</div>
                      <p className="text-xs text-muted-foreground">{text.cashFlow.actualCashNote}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{text.cashFlow.diff}</CardTitle>
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${period.totalDiff >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {period.totalDiff >= 0 ? '+' : '-'}{formatCurrency(period.totalDiff)}
                      </div>
                      <div className={`flex items-center gap-1 text-xs ${period.totalDiff >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {period.totalDiff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span>{text.cashFlow.diffVsExpected} {period.totalExpected === 0 ? '0.0' : ((period.totalDiff / period.totalExpected) * 100).toFixed(2)}%</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{text.cashFlow.vsPrevious}</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${previousPeriodDiff >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {previousPeriodDiff >= 0 ? '+' : ''}{formatCurrency(previousPeriodDiff)}
                      </div>
                      <div className={`flex items-center gap-1 text-xs ${previousPeriodDiff >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {previousPeriodDiff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span>{previousPeriodPercentage}%</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-8 h-8 w-8" />
          <CarouselNext className="-right-8 h-8 w-8" />
        </Carousel>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{text.cashFlow.detailTitle}</CardTitle>
              <CardDescription>
                {text.cashFlow.detailDescription.replace('{discrepancyCount}', String(currentPeriod.discrepancyCount)).replace('{negativeDiscrepancyCount}', String(currentPeriod.negativeDiscrepancyCount))}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit">
              {currentIndex + 1}/{PERIOD_COUNT}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {currentPeriod.entries.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                {text.cashFlow.rangeEmpty}
              </div>
            ) : (
              currentPeriod.entries.map((item) => {
                const diff = item.actual - item.expected

                return (
                  <div
                    key={getDateKey(item.date)}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium">
                        {item.date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="hidden gap-4 text-sm text-muted-foreground sm:flex">
                        <span>{text.cashFlow.expected}: {formatCurrency(item.expected)}</span>
                        <span>{text.cashFlow.actual}: {formatCurrency(item.actual)}</span>
                      </div>
                    </div>
                    <Badge
                      variant={diff === 0 ? 'secondary' : diff > 0 ? 'default' : 'destructive'}
                      className={diff > 0 ? 'bg-success text-success-foreground' : ''}
                    >
                      {diff === 0 ? text.cashFlow.match : diff > 0 ? `+${formatCurrency(diff)}` : `-${formatCurrency(diff)}`}
                    </Badge>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
