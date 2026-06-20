'use client'

import { useEffect, useState } from 'react'
import type { UseEmblaCarouselType } from 'embla-carousel-react'
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpDown, DollarSign, TrendingDown, TrendingUp } from 'lucide-react'
import { getCashAnalysis } from '@/lib/api/dashboard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { useWorkflow } from '@/contexts/workflow-context'
import { getTranslation } from '@/lib/i18n'
import type { CashAnalysisWindow } from '@/lib/types'
import { useStore } from '@/store/useStore'

type CarouselApi = UseEmblaCarouselType[1]

const PERIOD_COUNT = 5

function formatCurrency(amount: number) {
  return `$${Math.abs(Math.round(amount)).toLocaleString()}`
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '0.0%'
  }

  return `${value.toFixed(1)}%`
}

function formatRange(startDate: string, endDate: string, language: 'ko' | 'en') {
  const locale = language === 'ko' ? 'ko-KR' : 'en-US'
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const startLabel = start.toLocaleDateString(locale, { month: 'long', day: 'numeric' })
  const endLabel = end.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })
  return `${startLabel} - ${endLabel}`
}

export function CashFlowAnalysis() {
  const { selectedStoreId, language } = useStore()
  const { dataVersion } = useWorkflow()
  const text = getTranslation(language)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [windows, setWindows] = useState<CashAnalysisWindow[]>([])

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      const response = await getCashAnalysis({
        storeKey: selectedStoreId,
        periodDays: 14,
        windowCount: PERIOD_COUNT,
      })

      if (!isMounted) return
      setWindows(response.windows)
    }

    loadData().catch(() => {
      if (!isMounted) return
      setWindows([])
    })

    return () => {
      isMounted = false
    }
  }, [dataVersion, selectedStoreId])

  useEffect(() => {
    setCurrentIndex(0)
    carouselApi?.scrollTo(0, true)
  }, [windows, carouselApi])

  useEffect(() => {
    if (!carouselApi) return

    const onSelect = () => setCurrentIndex(carouselApi.selectedScrollSnap())
    carouselApi.on('select', onSelect)
    onSelect()

    return () => {
      carouselApi.off('select', onSelect)
    }
  }, [carouselApi])

  const currentPeriod = windows[currentIndex] ?? windows[0]
  const canMoveToPreviousPeriod = carouselApi?.canScrollNext() ?? false
  const canMoveToNextPeriod = carouselApi?.canScrollPrev() ?? false

  return (
    <section id="cashflow" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{text.cashFlow.title}</h2>
        <p className="text-muted-foreground">
          {currentPeriod ? formatRange(currentPeriod.startDate, currentPeriod.endDate, language) : '-'}
        </p>
      </div>

      <div className="relative px-10">
        <Carousel setApi={setCarouselApi} opts={{ startIndex: 0 }}>
          <CarouselContent>
            {windows.map((period) => (
              <CarouselItem key={`${period.startDate}-${period.endDate}`}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{text.cashFlow.expectedCash}</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(period.expectedCash)}</div>
                      <p className="text-xs text-muted-foreground">{text.cashFlow.expectedCashNote}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{text.cashFlow.actualCash}</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(period.actualCash)}</div>
                      <p className="text-xs text-muted-foreground">{text.cashFlow.actualCashNote}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{text.cashFlow.diff}</CardTitle>
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${period.difference >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {period.difference >= 0 ? '+' : '-'}{formatCurrency(period.difference)}
                      </div>
                      <div className={`flex items-center gap-1 text-xs ${period.difference >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {period.difference >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span>{text.cashFlow.diffVsExpected} {formatPercent(period.differenceRate)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{text.cashFlow.vsPrevious}</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${period.vsPreviousAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {period.vsPreviousAmount >= 0 ? '+' : ''}{formatCurrency(period.vsPreviousAmount)}
                      </div>
                      <div className={`flex items-center gap-1 text-xs ${period.vsPreviousAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {period.vsPreviousAmount >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span>{formatPercent(period.vsPreviousRate)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute top-1/2 -left-8 h-8 w-8 -translate-y-1/2 rounded-full"
            onClick={() => carouselApi?.scrollNext()}
            disabled={!canMoveToPreviousPeriod}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Previous period</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute top-1/2 -right-8 h-8 w-8 -translate-y-1/2 rounded-full"
            onClick={() => carouselApi?.scrollPrev()}
            disabled={!canMoveToNextPeriod}
          >
            <ArrowRight className="h-4 w-4" />
            <span className="sr-only">Next period</span>
          </Button>
        </Carousel>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{text.cashFlow.detailTitle}</CardTitle>
              <CardDescription>
                {currentPeriod
                  ? text.cashFlow.detailDescription
                      .replace('{discrepancyCount}', String(currentPeriod.discrepancyCount))
                      .replace('{negativeDiscrepancyCount}', String(currentPeriod.negativeDiscrepancyCount))
                  : text.cashFlow.rangeEmpty}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit">
              {Math.min(currentIndex + 1, windows.length)}/{PERIOD_COUNT}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] space-y-3 overflow-y-auto">
            {!currentPeriod || currentPeriod.details.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                {text.cashFlow.rangeEmpty}
              </div>
            ) : (
              currentPeriod.details.map((item) => (
                <div
                  key={item.date}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium">
                      {new Date(`${item.date}T00:00:00`).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
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
                    variant={item.difference === 0 ? 'secondary' : item.difference > 0 ? 'default' : 'destructive'}
                    className={item.difference > 0 ? 'bg-success text-success-foreground' : ''}
                  >
                    {item.difference === 0
                      ? text.cashFlow.match
                      : item.difference > 0
                        ? `+${formatCurrency(item.difference)}`
                        : `-${formatCurrency(item.difference)}`}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
