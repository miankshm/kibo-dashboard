'use client'

import { useEffect, useMemo, useState } from 'react'
import type { UseEmblaCarouselType } from 'embla-carousel-react'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { Banknote, CreditCard, Store as StoreIcon, TrendingDown, TrendingUp, Truck } from 'lucide-react'
import { getDashboardTrends } from '@/lib/api/dashboard'
import { getSalesList } from '@/lib/api/sales'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWorkflow } from '@/contexts/workflow-context'
import { getTranslation } from '@/lib/i18n'
import type { SaleRecord, SalesMode, TrendDataset } from '@/lib/types'
import { useStore } from '@/store/useStore'

type CarouselApi = UseEmblaCarouselType[1]

interface SalesCardProps {
  title: string
  value: string
  change: number
  icon: React.ElementType
}

interface SalesSlide {
  date: string
  total: number
  cards: Array<{
    key: 'storeVisits' | 'cardSales' | 'cashSales' | 'deliverySales'
    value: number
    change: number
  }>
}

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

function formatDate(dateString: string, language: 'ko' | 'en') {
  const date = new Date(`${dateString}T00:00:00`)
  return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCurrencyAmount(value: number, language: 'ko' | 'en') {
  const locale = language === 'ko' ? 'ko-KR' : 'en-US'
  const hasFraction = !Number.isInteger(value)

  return value.toLocaleString(locale, {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  })
}

function buildSlides(entries: SaleRecord[], salesMode: SalesMode): SalesSlide[] {
  const calculateChange = (current: number, previous: number | undefined) => {
    if (previous === undefined) return 0
    if (previous === 0) {
      return current === 0 ? 0 : 100
    }

    return Number((((current - previous) / previous) * 100).toFixed(1))
  }

  const calculateDeliveryValue = (entry: SaleRecord) => {
    if (salesMode === 'gross') {
      return entry.uberEatsSales + entry.doorDashSales
    }

    return entry.uberEatsSales * 0.77 + entry.doorDashSales * 0.85
  }

  return entries.map((entry, index) => {
    const previousEntry = index > 0 ? entries[index - 1] : undefined
    const total = salesMode === 'gross' ? entry.totalSales : entry.netSales
    const storeVisits = entry.cardSales + entry.cashSales
    const previousStoreVisits = previousEntry
      ? previousEntry.cardSales + previousEntry.cashSales
      : undefined
    const deliverySales = calculateDeliveryValue(entry)
    const previousDeliverySales = previousEntry
      ? calculateDeliveryValue(previousEntry)
      : undefined

    return {
      date: entry.salesDate,
      total,
      cards: [
        { key: 'storeVisits', value: storeVisits, change: calculateChange(storeVisits, previousStoreVisits) },
        { key: 'cardSales', value: entry.cardSales, change: calculateChange(entry.cardSales, previousEntry?.cardSales) },
        { key: 'cashSales', value: entry.cashSales, change: calculateChange(entry.cashSales, previousEntry?.cashSales) },
        { key: 'deliverySales', value: deliverySales, change: calculateChange(deliverySales, previousDeliverySales) },
      ],
    }
  })
}

function aggregateSalesByDate(entries: SaleRecord[]): SaleRecord[] {
  const totalsByDate = new Map<string, SaleRecord>()

  for (const entry of entries) {
    const existing = totalsByDate.get(entry.salesDate)
    if (!existing) {
      totalsByDate.set(entry.salesDate, { ...entry })
      continue
    }

    totalsByDate.set(entry.salesDate, {
      ...existing,
      cardSales: existing.cardSales + entry.cardSales,
      cashSales: existing.cashSales + entry.cashSales,
      uberEatsSales: existing.uberEatsSales + entry.uberEatsSales,
      doorDashSales: existing.doorDashSales + entry.doorDashSales,
      cashAndCarrySales: existing.cashAndCarrySales + entry.cashAndCarrySales,
      tips: existing.tips + entry.tips,
      actualClosingCash: existing.actualClosingCash + entry.actualClosingCash,
      totalSales: existing.totalSales + entry.totalSales,
      netSales: existing.netSales + entry.netSales,
      expectedCash: existing.expectedCash + entry.expectedCash,
      cashDifference: existing.cashDifference + entry.cashDifference,
    })
  }

  return Array.from(totalsByDate.values()).sort((left, right) => left.salesDate.localeCompare(right.salesDate))
}

function SalesCard({ title, value, change, icon: Icon }: SalesCardProps) {
  const isPositive = change >= 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-success' : 'text-destructive'}`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{isPositive ? '+' : ''}{change}%</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function SalesSummary() {
  const { showGrossSales, toggleSalesMode, selectedPeriod, setSelectedPeriod, dataVersion } = useWorkflow()
  const { selectedStoreId, language } = useStore()
  const text = getTranslation(language)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [slides, setSlides] = useState<SalesSlide[]>([])
  const [trendLabels, setTrendLabels] = useState<string[]>([])
  const [trendDatasets, setTrendDatasets] = useState<TrendDataset[]>([])
  const [chartPeriodTotal, setChartPeriodTotal] = useState(0)

  useEffect(() => {
    if (!carouselApi) return

    const onSelect = () => setCurrentIndex(carouselApi.selectedScrollSnap())
    carouselApi.on('select', onSelect)
    onSelect()

    return () => {
      carouselApi.off('select', onSelect)
    }
  }, [carouselApi])

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      const endDate = new Date()
      const startDate = new Date(endDate)
      startDate.setDate(endDate.getDate() - 7)
      const salesMode: SalesMode = showGrossSales ? 'gross' : 'net'

      const [salesResponse, trendResponse] = await Promise.all([
        getSalesList({
          storeKey: selectedStoreId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          limit: selectedStoreId === 'all' ? 16 : 8,
          sortOrder: 'asc',
        }),
        getDashboardTrends({
          storeKey: selectedStoreId,
          period: selectedPeriod,
          salesMode,
          language,
        }),
      ])

      if (!isMounted) return

      const summarizedItems = selectedStoreId === 'all'
        ? aggregateSalesByDate(salesResponse.items)
        : salesResponse.items

      setSlides(buildSlides(summarizedItems, salesMode))
      setTrendLabels(trendResponse.labels)
      setTrendDatasets(trendResponse.datasets)
      setChartPeriodTotal(trendResponse.periodTotal)
    }

    loadData().catch(() => {
      if (!isMounted) return
      setSlides([])
      setTrendLabels([])
      setTrendDatasets([])
      setChartPeriodTotal(0)
    })

    return () => {
      isMounted = false
    }
  }, [dataVersion, language, selectedPeriod, selectedStoreId, showGrossSales])

  useEffect(() => {
    if (slides.length === 0) {
      setCurrentIndex(0)
      return
    }

    const nextIndex = slides.length - 1
    setCurrentIndex(nextIndex)
    carouselApi?.scrollTo(nextIndex, true)
  }, [slides, carouselApi])

  const currentSlide = slides[currentIndex] ?? slides[slides.length - 1]
  const displayTotal = currentSlide?.total ?? 0
  const cumulativeSalesLabel =
    selectedPeriod === 'daily'
      ? text.salesSummary.cumulativeThisWeek
      : selectedPeriod === 'weekly'
        ? text.salesSummary.cumulativeThisMonth
        : text.salesSummary.cumulativeThisYear

  const trendValues = trendDatasets[0]?.data ?? []
  const chartData = useMemo(() => ({
    labels: trendLabels,
    datasets: [
      {
        type: 'bar' as const,
        label: showGrossSales ? text.salesSummary.gross : text.salesSummary.net,
        data: trendValues,
        backgroundColor: 'oklch(0.527 0.154 150.069 / 0.18)',
        borderColor: 'oklch(0.527 0.154 150.069 / 0.35)',
        borderRadius: 10,
        borderSkipped: false,
        maxBarThickness: 42,
      },
      {
        type: 'line' as const,
        label: showGrossSales ? text.salesSummary.gross : text.salesSummary.net,
        data: trendValues,
        borderColor: 'oklch(0.527 0.154 150.069)',
        backgroundColor: 'oklch(0.527 0.154 150.069 / 0.22)',
        fill: false,
        tension: 0.4,
        pointBackgroundColor: 'oklch(0.527 0.154 150.069)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 2,
        borderWidth: 3,
        order: 0,
      },
    ],
  }), [showGrossSales, text, trendLabels, trendValues])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context: { parsed: { y: number } }) => `$${formatCurrencyAmount(context.parsed.y, language)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'oklch(0.556 0 0)' },
      },
      y: {
        grid: { color: 'oklch(0.922 0 0)' },
        ticks: {
          color: 'oklch(0.556 0 0)',
          callback: (value: number | string) => `$${formatCurrencyAmount(Number(value), language)}`,
        },
      },
    },
  }

  return (
    <section id="sales" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{text.sidebar.salesSummary}</h2>
          <p className="text-muted-foreground">
            {text.salesSummary.totalLabel}{' '}
            <span className="text-xl font-bold text-foreground">
              ${formatCurrencyAmount(displayTotal, language)}
            </span>
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {currentSlide ? formatDate(currentSlide.date, language) : '-'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="sales-mode"
              checked={showGrossSales}
              onCheckedChange={toggleSalesMode}
            />
            <Label htmlFor="sales-mode" className="text-sm">
              {showGrossSales ? text.salesSummary.gross : text.salesSummary.net}
            </Label>
          </div>
        </div>
      </div>

      <div className="relative px-10">
        <Carousel
          setApi={setCarouselApi}
          opts={{ startIndex: Math.max(slides.length - 1, 0) }}
        >
          <CarouselContent>
            {slides.map((slide) => (
              <CarouselItem key={slide.date}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <SalesCard
                    title={text.salesSummary.storeVisits}
                    value={`$${formatCurrencyAmount(slide.cards[0]?.value ?? 0, language)}`}
                    change={slide.cards[0]?.change ?? 0}
                    icon={StoreIcon}
                  />
                  <SalesCard
                    title={text.salesSummary.cardSales}
                    value={`$${formatCurrencyAmount(slide.cards[1]?.value ?? 0, language)}`}
                    change={slide.cards[1]?.change ?? 0}
                    icon={CreditCard}
                  />
                  <SalesCard
                    title={text.salesSummary.cashSales}
                    value={`$${formatCurrencyAmount(slide.cards[2]?.value ?? 0, language)}`}
                    change={slide.cards[2]?.change ?? 0}
                    icon={Banknote}
                  />
                  <SalesCard
                    title={text.salesSummary.deliverySales}
                    value={`$${formatCurrencyAmount(slide.cards[3]?.value ?? 0, language)}`}
                    change={slide.cards[3]?.change ?? 0}
                    icon={Truck}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-10" />
          <CarouselNext className="-right-10" />
        </Carousel>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{text.salesSummary.trendTitle}</CardTitle>
              <CardDescription>
                <span className="font-medium text-foreground">
                  {cumulativeSalesLabel} ${formatCurrencyAmount(chartPeriodTotal, language)}
                </span>
              </CardDescription>
            </div>
            <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as 'daily' | 'weekly' | 'monthly')}>
              <TabsList>
                <TabsTrigger value="daily">{text.salesSummary.daily}</TabsTrigger>
                <TabsTrigger value="weekly">{text.salesSummary.weekly}</TabsTrigger>
                <TabsTrigger value="monthly">{text.salesSummary.monthly}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Chart type="bar" data={chartData} options={chartOptions as object} />
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

