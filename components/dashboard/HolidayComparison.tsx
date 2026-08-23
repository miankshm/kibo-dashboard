'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
  type Plugin,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { Calendar, TrendingDown, TrendingUp } from 'lucide-react'
import { getHolidayComparison, getHolidayList, getUpcomingHolidayList } from '@/lib/api/holidays'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useWorkflow } from '@/contexts/workflow-context'
import { getTranslation } from '@/lib/i18n'
import type { HolidayComparisonData, HolidayListItem, HolidayRange, UpcomingHoliday } from '@/lib/types'
import { STORES, useStore } from '@/store/useStore'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const CHART_RANGE_OPTIONS = {
  '1y': { years: 1 },
  '3y': { years: 3 },
  '5y': { years: 5 },
} as const

type ChartRange = keyof typeof CHART_RANGE_OPTIONS

const usdCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const formatCurrency = (value: number) => usdCurrencyFormatter.format(value)

const formatHolidayDate = (dateString: string, language: 'ko' | 'en') => {
  const date = new Date(`${dateString}T00:00:00`)
  const weekday = new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', {
    weekday: 'short',
  }).format(date)

  return `${dateString} (${weekday})`
}

const valueLabelPlugin = {
  id: 'valueLabelPlugin',
  afterDatasetsDraw: (chart: ChartJS<'bar'>) => {
    const { ctx, chartArea } = chart
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex)
      meta.data.forEach((bar, index) => {
        const rawValue = dataset.data[index]
        const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
        if (!Number.isFinite(value)) return
        const position = bar.tooltipPosition(true)
        if (position.x === null || position.y === null) return
        const labelY = Math.max(position.y - 8, chartArea.top + 12)

        ctx.save()
        ctx.fillStyle = '#111827'
        ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(formatCurrency(value), position.x, labelY)
        ctx.restore()
      })
    })
  },
}

ChartJS.register(valueLabelPlugin as Plugin<'bar'>)

export function HolidayComparison() {
  const { selectedStoreId, language } = useStore()
  const { dataVersion } = useWorkflow()
  const text = getTranslation(language)
  const [selectedHolidayId, setSelectedHolidayId] = useState('')
  const [chartRange, setChartRange] = useState<ChartRange>('1y')
  const [holidays, setHolidays] = useState<HolidayListItem[]>([])
  const [upcomingHolidays, setUpcomingHolidays] = useState<UpcomingHoliday[]>([])
  const [comparison, setComparison] = useState<HolidayComparisonData | null>(null)
  const selectedStore = STORES.find((store) => store.id === selectedStoreId)

  useEffect(() => {
    let isMounted = true

    async function loadHolidayLists() {
      const [holidayList, upcomingList] = await Promise.all([
        getHolidayList(),
        getUpcomingHolidayList(30),
      ])

      if (!isMounted) return

      setHolidays(holidayList)
      setUpcomingHolidays(upcomingList)
      setSelectedHolidayId((current) => current || upcomingList[0]?.id || holidayList[0]?.id || '')
    }

    loadHolidayLists().catch(() => {
      if (!isMounted) return
      setHolidays([])
      setUpcomingHolidays([])
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedHolidayId) return

    let isMounted = true

    async function loadComparison() {
      const nextComparison = await getHolidayComparison({
        holidayId: selectedHolidayId,
        storeKey: selectedStoreId,
        range: chartRange as HolidayRange,
      })

      if (!isMounted) return
      setComparison(nextComparison)
    }

    loadComparison().catch(() => {
      if (!isMounted) return
      setComparison(null)
    })

    return () => {
      isMounted = false
    }
  }, [chartRange, dataVersion, selectedHolidayId, selectedStoreId])

  const selectedHoliday = useMemo(() => {
    if (comparison) return comparison.holiday
    return holidays.find((holiday) => holiday.id === selectedHolidayId) ?? holidays[0]
  }, [comparison, holidays, selectedHolidayId])

  const chartData = useMemo(() => ({
    labels: comparison?.chart.labels ?? [],
    datasets: [
      {
        label: `${selectedHoliday?.name ?? text.holiday.title} 매출`,
        data: comparison?.chart.data ?? [],
        backgroundColor: '#99B759',
        borderRadius: 4,
      },
    ],
  }), [comparison, selectedHoliday, text])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        callbacks: {
          label: (context: { dataset: { label: string }; parsed: { y: number } }) =>
            `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'oklch(0.556 0 0)' },
      },
      y: {
        beginAtZero: true,
        grace: '12%',
        grid: { color: 'oklch(0.922 0 0)' },
        ticks: {
          color: 'oklch(0.556 0 0)',
          callback: (value: number | string) => formatCurrency(Number(value)),
        },
      },
    },
  }

  const historyRows = comparison?.history ?? []

  return (
    <section id="holiday" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{text.holiday.title}</h2>
        <p className="text-muted-foreground">
          {selectedStoreId === 'all'
            ? text.holiday.descriptionAll
            : text.holiday.descriptionStore.replace('{store}', selectedStore?.name[language] ?? selectedStoreId)}
        </p>
      </div>

      <Card className="border-primary/50 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5 text-primary" />
            {text.holiday.selectionTitle}
          </CardTitle>
          <CardDescription>{text.holiday.selectionDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div>
              <p className="mb-2 text-sm font-medium">{text.holiday.upcomingTitle}</p>
              <div className="flex flex-wrap gap-2">
                {upcomingHolidays.length > 0 ? (
                  upcomingHolidays.map((holiday) => (
                    <Button
                      key={holiday.id}
                      size="sm"
                      variant={selectedHoliday?.id === holiday.id ? 'default' : 'outline'}
                      onClick={() => setSelectedHolidayId(holiday.id)}
                      className="h-auto py-2"
                    >
                      {holiday.name} ({holiday.nextDate})
                    </Button>
                  ))
                ) : (
                  <Badge variant="secondary">{text.holiday.noneUpcoming}</Badge>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">{text.holiday.allTitle}</p>
              <Select value={selectedHoliday?.id ?? ''} onValueChange={setSelectedHolidayId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={text.holiday.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {holidays.map((holiday) => (
                    <SelectItem key={holiday.id} value={holiday.id}>
                      {holiday.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>{text.holiday.trendTitle.replace('{holiday}', selectedHoliday?.name ?? text.holiday.title)}</CardTitle>
                <CardDescription>{text.holiday.trendDescription}</CardDescription>
              </div>
              <ToggleGroup
                type="single"
                value={chartRange}
                onValueChange={(value) => {
                  if (value) setChartRange(value as ChartRange)
                }}
                variant="outline"
              >
                {Object.entries(CHART_RANGE_OPTIONS).map(([value, option]) => (
                  <ToggleGroupItem key={value} value={value}>
                    {value === '1y' ? text.holiday.lastYear : `${option.years}${language === 'ko' ? '년' : 'y'}`}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <Bar data={chartData} options={chartOptions as object} plugins={[valueLabelPlugin]} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{text.holiday.historyTitle.replace('{holiday}', selectedHoliday?.name ?? text.holiday.title)}</CardTitle>
            <CardDescription>{text.holiday.historyDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{text.holiday.year}</TableHead>
                    <TableHead>{text.holiday.date}</TableHead>
                    <TableHead className="text-right">{text.holiday.sales}</TableHead>
                    <TableHead className="text-right">{text.holiday.yoy}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRows.length > 0 ? (
                    historyRows.map((row) => (
                      <TableRow key={`${row.year}-${row.date}`}>
                        <TableCell>{row.year}</TableCell>
                        <TableCell>{formatHolidayDate(row.date, language)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.sales)}</TableCell>
                        <TableCell className="text-right">
                          {row.yoy === null ? (
                            <Badge variant="secondary">-</Badge>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 font-medium ${
                                row.yoy >= 0 ? 'text-success' : 'text-destructive'
                              }`}
                            >
                              {row.yoy >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                              {row.yoy >= 0 ? '+' : ''}
                              {row.yoy.toFixed(1)}%
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        {text.holiday.noData}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
