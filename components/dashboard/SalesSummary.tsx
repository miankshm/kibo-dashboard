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

function getChange(dateString: string, offset: number) {
  const date = new Date(`${dateString}T00:00:00`)
  const raw = ((date.getDate() * 13 + date.getDay() * 7 + offset) % 26) - 10
  return Number((raw / 2).toFixed(1))
}

function buildSlides(entries: SaleRecord[], salesMode: SalesMode): SalesSlide[] {
  return entries.map((entry) => {
    const total = salesMode === 'gross' ? entry.totalSales : entry.netSales
    return {
      date: entry.salesDate,
      total,
      cards: [
        { key: 'storeVisits', value: Math.round(total * 0.45), change: getChange(entry.salesDate, 11) },
        { key: 'cardSales', value: Math.round(total * 0.35), change: getChange(entry.salesDate, 17) },
        { key: 'cashSales', value: Math.round(total * 0.15), change: getChange(entry.salesDate, 23) },
        { key: 'deliverySales', value: Math.round(total * 0.2), change: getChange(entry.salesDate, 29) },
      ],
    }
  })
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
          limit: 8,
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

      setSlides(buildSlides(salesResponse.items, salesMode))
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
  const selectedPeriodLabel =
    selectedPeriod === 'daily'
      ? text.salesSummary.daily
      : selectedPeriod === 'weekly'
        ? text.salesSummary.weekly
        : text.salesSummary.monthly

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
          label: (context: { parsed: { y: number } }) => `$${context.parsed.y.toLocaleString()}`,
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
          callback: (value: number | string) => `$${Number(value).toLocaleString()}`,
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
              ${displayTotal.toLocaleString()}
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
                    value={`$${slide.cards[0]?.value.toLocaleString() ?? '0'}`}
                    change={slide.cards[0]?.change ?? 0}
                    icon={StoreIcon}
                  />
                  <SalesCard
                    title={text.salesSummary.cardSales}
                    value={`$${slide.cards[1]?.value.toLocaleString() ?? '0'}`}
                    change={slide.cards[1]?.change ?? 0}
                    icon={CreditCard}
                  />
                  <SalesCard
                    title={text.salesSummary.cashSales}
                    value={`$${slide.cards[2]?.value.toLocaleString() ?? '0'}`}
                    change={slide.cards[2]?.change ?? 0}
                    icon={Banknote}
                  />
                  <SalesCard
                    title={text.salesSummary.deliverySales}
                    value={`$${slide.cards[3]?.value.toLocaleString() ?? '0'}`}
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
                  {selectedPeriodLabel} {text.salesSummary.periodTotal} ${Math.round(chartPeriodTotal).toLocaleString()}
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

