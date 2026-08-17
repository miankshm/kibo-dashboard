'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import { Banknote, CreditCard, Package, TrendingDown, TrendingUp, Truck } from 'lucide-react'
import { getDashboardTrends } from '@/lib/api/dashboard'
import { getSalesList } from '@/lib/api/sales'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWorkflow } from '@/contexts/workflow-context'
import { getTranslation } from '@/lib/i18n'
import type { SaleRecord, SalesMode, TrendDataset } from '@/lib/types'
import { useStore } from '@/store/useStore'

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
    key: 'cardSales' | 'cashSales' | 'deliverySales' | 'cashAndCarrySales'
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

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
    const deliverySales = calculateDeliveryValue(entry)
    const previousDeliverySales = previousEntry
      ? calculateDeliveryValue(previousEntry)
      : undefined
    const cashAndCarrySales = entry.cashAndCarrySales
    const previousCashAndCarrySales = previousEntry?.cashAndCarrySales

    return {
      date: entry.salesDate,
      total,
      cards: [
        { key: 'cardSales', value: entry.cardSales, change: calculateChange(entry.cardSales, previousEntry?.cardSales) },
        { key: 'cashSales', value: entry.cashSales, change: calculateChange(entry.cashSales, previousEntry?.cashSales) },
        { key: 'deliverySales', value: deliverySales, change: calculateChange(deliverySales, previousDeliverySales) },
        { key: 'cashAndCarrySales', value: cashAndCarrySales, change: calculateChange(cashAndCarrySales, previousCashAndCarrySales) },
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
  const trendChartRef = useRef<ChartJS<'bar'> | null>(null)
  const [slides, setSlides] = useState<SalesSlide[]>([])
  const [selectedKpiDate, setSelectedKpiDate] = useState<string | null>(null)
  const [trendLabels, setTrendLabels] = useState<string[]>([])
  const [trendDatasets, setTrendDatasets] = useState<TrendDataset[]>([])
  const [chartPeriodTotal, setChartPeriodTotal] = useState(0)

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
          startDate: toDateKey(startDate),
          endDate: toDateKey(endDate),
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
    if (selectedPeriod !== 'daily') {
      setSelectedKpiDate(null)
    }
  }, [selectedPeriod])

  const slideByDate = useMemo(() => new Map(slides.map((slide) => [slide.date, slide])), [slides])

  const dailyDateKeys = useMemo(() => {
    const now = startOfDay(new Date())
    const daysFromMonday = (now.getDay() + 6) % 7
    const weekStart = addDays(now, -daysFromMonday)

    return Array.from({ length: daysFromMonday + 1 }, (_, index) => toDateKey(addDays(weekStart, index)))
  }, [dataVersion])

  const fallbackDailySlide = useMemo(() => {
    if (selectedPeriod !== 'daily' || !selectedKpiDate) return null

    return {
      date: selectedKpiDate,
      total: 0,
      cards: [
        { key: 'cardSales' as const, value: 0, change: 0 },
        { key: 'cashSales' as const, value: 0, change: 0 },
        { key: 'deliverySales' as const, value: 0, change: 0 },
        { key: 'cashAndCarrySales' as const, value: 0, change: 0 },
      ],
    }
  }, [selectedKpiDate, selectedPeriod])

  const currentSlide = selectedPeriod === 'daily' && selectedKpiDate
    ? slideByDate.get(selectedKpiDate) ?? fallbackDailySlide ?? slides[slides.length - 1]
    : slides[slides.length - 1]
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
        backgroundColor: 'rgb(153 183 89 / 0.18)',
        borderColor: 'rgb(153 183 89 / 0.35)',
        borderRadius: 10,
        borderSkipped: false,
        maxBarThickness: 42,
      },
      {
        type: 'line' as const,
        label: showGrossSales ? text.salesSummary.gross : text.salesSummary.net,
        data: trendValues,
        borderColor: '#99B759',
        backgroundColor: 'rgb(153 183 89 / 0.22)',
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#99B759',
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
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
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
        filter: (tooltipItem: { datasetIndex: number }) => tooltipItem.datasetIndex === 0,
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

  const handleTrendChartClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (selectedPeriod !== 'daily') return

    const chart = trendChartRef.current
    if (!chart || !chart.canvas || !chart.scales?.x) return

    const rect = chart.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const rawIndex = chart.scales.x.getValueForPixel(x)
    const normalizedIndex = typeof rawIndex === 'number' ? Math.round(rawIndex) : Number(rawIndex)
    if (!Number.isFinite(normalizedIndex)) return

    const clickedIndex = Math.max(0, Math.min(dailyDateKeys.length - 1, normalizedIndex))

    const clickedDate = dailyDateKeys[clickedIndex]
    if (!clickedDate) return

    setSelectedKpiDate(clickedDate)
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SalesCard
          title={text.salesSummary.cardSales}
          value={`$${formatCurrencyAmount(currentSlide?.cards[0]?.value ?? 0, language)}`}
          change={currentSlide?.cards[0]?.change ?? 0}
          icon={CreditCard}
        />
        <SalesCard
          title={text.salesSummary.cashSales}
          value={`$${formatCurrencyAmount(currentSlide?.cards[1]?.value ?? 0, language)}`}
          change={currentSlide?.cards[1]?.change ?? 0}
          icon={Banknote}
        />
        <SalesCard
          title={text.salesSummary.deliverySales}
          value={`$${formatCurrencyAmount(currentSlide?.cards[2]?.value ?? 0, language)}`}
          change={currentSlide?.cards[2]?.change ?? 0}
          icon={Truck}
        />
        <SalesCard
          title={text.salesSummary.cashAndCarrySales}
          value={`$${formatCurrencyAmount(currentSlide?.cards[3]?.value ?? 0, language)}`}
          change={currentSlide?.cards[3]?.change ?? 0}
          icon={Package}
        />
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
          <div className="h-[300px]" onClick={handleTrendChartClick}>
            <Chart ref={trendChartRef} type="bar" data={chartData} options={chartOptions as object} />
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

