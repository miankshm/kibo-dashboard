'use client'

import { useMemo, useState, useEffect } from 'react'
import type { UseEmblaCarouselType } from 'embla-carousel-react'
import {
  BarElement,
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { TrendingUp, TrendingDown, CreditCard, Banknote, Truck, Store as StoreIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel'
import { useWorkflow } from '@/contexts/workflow-context'
import { useStore } from '@/store/useStore'
import { getTranslation } from '@/lib/i18n'

type CarouselApi = UseEmblaCarouselType[1]

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

// 앱 기준 오늘 날짜 (포트폴리오 mock)
const TODAY = new Date(2026, 4, 17) // May 17, 2026

// 날짜 기반 결정론적 mock 데이터 생성
function generateDayData(date: Date, storeId: 'kibo-north' | 'kibo-south') {
  const dayOfWeek = date.getDay()
  const dateNum = date.getDate()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const storeSeed = storeId === 'kibo-north' ? 17 : 31
  const storeFactor = storeId === 'kibo-north' ? 1.06 : 0.92
  const seed = (dateNum * 137 + dayOfWeek * 41 + storeSeed) % 100
  const baseTotal = Math.round((16000 + seed * 80) * (isWeekend ? 1.3 : 1.0) * storeFactor)

  return {
    instore: { value: Math.round(baseTotal * 0.45), change: parseFloat(((seed % 25 - 10) / 2).toFixed(1)) },
    card: { value: Math.round(baseTotal * 0.35), change: parseFloat(((seed % 30 - 8) / 2).toFixed(1)) },
    cash: { value: Math.round(baseTotal * 0.15), change: parseFloat(((seed % 20 - 12) / 2).toFixed(1)) },
    delivery: { value: Math.round(baseTotal * 0.20), change: parseFloat(((seed % 35 - 5) / 2).toFixed(1)) },
    total: baseTotal,
  }
}

function combineDayData(
  northData: ReturnType<typeof generateDayData>,
  southData: ReturnType<typeof generateDayData>
) {
  return {
    instore: {
      value: northData.instore.value + southData.instore.value,
      change: parseFloat(((northData.instore.change + southData.instore.change) / 2).toFixed(1)),
    },
    card: {
      value: northData.card.value + southData.card.value,
      change: parseFloat(((northData.card.change + southData.card.change) / 2).toFixed(1)),
    },
    cash: {
      value: northData.cash.value + southData.cash.value,
      change: parseFloat(((northData.cash.change + southData.cash.change) / 2).toFixed(1)),
    },
    delivery: {
      value: northData.delivery.value + southData.delivery.value,
      change: parseFloat(((northData.delivery.change + southData.delivery.change) / 2).toFixed(1)),
    },
    total: northData.total + southData.total,
  }
}

function formatDate(date: Date, language: 'ko' | 'en') {
  return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Mock 차트 데이터 (기존 유지)
const mockSalesData = {
  daily: {
    labels: ['월', '화', '수', '목', '금', '토', '일'],
    data: [2400, 2100, 2800, 3100, 3400, 4200, 3800],
  },
  weekly: {
    labels: ['1주차', '2주차', '3주차', '4주차'],
    data: [16800, 18200, 17500, 19100],
  },
  monthly: {
    labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
    data: [72000, 68000, 75000, 82000, 78000, 85000],
  },
}

interface SalesCardProps {
  title: string
  value: string
  change: number
  icon: React.ElementType
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
  const { showGrossSales, toggleSalesMode, selectedPeriod, setSelectedPeriod, dailySalesFormData } = useWorkflow()
  const { selectedStoreId, language } = useStore()
  const { dailySalesEntries } = useWorkflow()
  const text = getTranslation(language)

  const filteredEntries = useMemo(() => {
    if (selectedStoreId === 'all') return dailySalesEntries
    return dailySalesEntries.filter((entry) => entry.storeId === selectedStoreId)
  }, [dailySalesEntries, selectedStoreId])

  // 오늘 매출 입력 여부 확인
  const hasTodaySales =
    filteredEntries.some((entry) => entry.date && new Date(entry.date).toDateString() === TODAY.toDateString()) ||
    (selectedStoreId !== 'all' &&
      dailySalesFormData.date !== null &&
      new Date(dailySalesFormData.date).toDateString() === TODAY.toDateString() &&
      dailySalesFormData.storeId === selectedStoreId)

  // 슬라이드 목록 생성: 7일 전 ~ 최근 접근 가능한 날짜
  const slides = useMemo(() => {
    const maxOffset = hasTodaySales ? 0 : 1 // 0=오늘, 1=어제
    const result = []

    const getScopedDayData = (date: Date) => {
      if (selectedStoreId === 'all') {
        const north = generateDayData(date, 'kibo-north')
        const south = generateDayData(date, 'kibo-south')
        return combineDayData(north, south)
      }
      return generateDayData(date, selectedStoreId)
    }

    for (let i = 7; i >= maxOffset; i--) {
      const date = new Date(TODAY)
      date.setDate(TODAY.getDate() - i)
      result.push({ date, data: getScopedDayData(date) })
    }
    return result
  }, [hasTodaySales, selectedStoreId])

  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [currentIndex, setCurrentIndex] = useState(slides.length - 1)

  // API 연결 후 선택 이벤트 구독
  useEffect(() => {
    if (!carouselApi) return
    const onSelect = () => setCurrentIndex(carouselApi.selectedScrollSnap())
    carouselApi.on('select', onSelect)
    return () => { carouselApi.off('select', onSelect) }
  }, [carouselApi])

  // hasTodaySales 변경 시 마지막 슬라이드로 리셋
  useEffect(() => {
    setCurrentIndex(slides.length - 1)
    carouselApi?.scrollTo(slides.length - 1, true)
  }, [hasTodaySales, slides.length, carouselApi])

  const currentSlide = slides[currentIndex] ?? slides[slides.length - 1]
  const dayData = currentSlide.data
  const displayTotal = showGrossSales ? dayData.total : Math.round(dayData.total * 0.85)
  const selectedPeriodLabel =
    selectedPeriod === 'daily'
      ? text.salesSummary.daily
      : selectedPeriod === 'weekly'
        ? text.salesSummary.weekly
        : text.salesSummary.monthly

  const chartData = useMemo(() => {
    const periodData = mockSalesData[selectedPeriod]
    const scopedFactor = selectedStoreId === 'all' ? 2.0 : selectedStoreId === 'kibo-north' ? 1.06 : 0.94
    const scopedValues = periodData.data.map((v) => Math.round(v * scopedFactor))
    const values = showGrossSales ? scopedValues : scopedValues.map((v) => v * 0.85)
    return {
      labels: periodData.labels,
      datasets: [
        {
          type: 'bar' as const,
          label: showGrossSales ? text.salesSummary.gross : text.salesSummary.net,
          data: values,
          backgroundColor: 'oklch(0.527 0.154 150.069 / 0.18)',
          borderColor: 'oklch(0.527 0.154 150.069 / 0.35)',
          borderRadius: 10,
          borderSkipped: false,
          maxBarThickness: 42,
        },
        {
          type: 'line' as const,
          label: showGrossSales ? text.salesSummary.gross : text.salesSummary.net,
          data: values,
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
    }
  }, [selectedPeriod, showGrossSales, selectedStoreId, text])

  const chartPeriodTotal = useMemo(() => {
    const periodData = mockSalesData[selectedPeriod]
    const scopedFactor = selectedStoreId === 'all' ? 2.0 : selectedStoreId === 'kibo-north' ? 1.06 : 0.94
    const scopedValues = periodData.data.map((v) => Math.round(v * scopedFactor))
    const values = showGrossSales ? scopedValues : scopedValues.map((v) => v * 0.85)
    return values.reduce((sum, value) => sum + value, 0)
  }, [selectedPeriod, showGrossSales, selectedStoreId])

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
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDate(currentSlide.date, language)}
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

      {/* Summary Cards Carousel */}
      <div className="relative px-10">
        <Carousel
          setApi={setCarouselApi}
          opts={{ startIndex: slides.length - 1 }}
        >
          <CarouselContent>
            {slides.map(({ date, data }) => {
              const slideTotal = showGrossSales ? data.total : Math.round(data.total * 0.85)
              return (
                <CarouselItem key={date.toISOString()}>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <SalesCard
                      title={text.salesSummary.storeVisits}
                      value={`$${Math.round(slideTotal * 0.45).toLocaleString()}`}
                      change={data.instore.change}
                      icon={StoreIcon}
                    />
                    <SalesCard
                      title={text.salesSummary.cardSales}
                      value={`$${Math.round(slideTotal * 0.35).toLocaleString()}`}
                      change={data.card.change}
                      icon={CreditCard}
                    />
                    <SalesCard
                      title={text.salesSummary.cashSales}
                      value={`$${Math.round(slideTotal * 0.15).toLocaleString()}`}
                      change={data.cash.change}
                      icon={Banknote}
                    />
                    <SalesCard
                      title={text.salesSummary.deliverySales}
                      value={`$${Math.round(slideTotal * 0.20).toLocaleString()}`}
                      change={data.delivery.change}
                      icon={Truck}
                    />
                  </div>
                </CarouselItem>
              )
            })}
          </CarouselContent>
          <CarouselPrevious className="-left-10" />
          <CarouselNext className="-right-10" />
        </Carousel>
      </div>

      {/* Chart Section */}
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
            <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as 'daily' | 'weekly' | 'monthly')}>
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

