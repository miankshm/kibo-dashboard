'use client'

import { useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type Plugin,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useStore, STORES } from '@/store/useStore'
import { getTranslation } from '@/lib/i18n'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

type SalesByYear = {
  [year: number]: number
}

interface HolidayData {
  id: string
  holiday: string
  month: number
  day: number
  salesByYear: SalesByYear
}

const mockHolidayData: HolidayData[] = [
  {
    id: '1',
    holiday: "New Year's Day",
    month: 1,
    day: 1,
    salesByYear: {
      2024: 8500,
      2023: 7800,
      2022: 7200,
      2021: 6800,
      2020: 6100,
    },
  },
  {
    id: '2',
    holiday: "Valentine's Day",
    month: 2,
    day: 14,
    salesByYear: {
      2024: 12300,
      2023: 10500,
      2022: 9800,
      2021: 9200,
      2020: 8700,
    },
  },
  {
    id: '3',
    holiday: 'Easter',
    month: 3,
    day: 31,
    salesByYear: {
      2024: 6200,
      2023: 5900,
      2022: 5500,
      2021: 5100,
      2020: 4700,
    },
  },
  {
    id: '4',
    holiday: "Mother's Day",
    month: 5,
    day: 12,
    salesByYear: {
      2024: 15800,
      2023: 14200,
      2022: 12800,
      2021: 11600,
      2020: 10400,
    },
  },
  {
    id: '5',
    holiday: "Father's Day",
    month: 6,
    day: 16,
    salesByYear: {
      2024: 11200,
      2023: 10800,
      2022: 9900,
      2021: 9300,
      2020: 8600,
    },
  },
  {
    id: '6',
    holiday: 'Thanksgiving',
    month: 11,
    day: 28,
    salesByYear: {
      2024: 0,
      2023: 18500,
      2022: 16800,
      2021: 15400,
      2020: 14600,
    },
  },
  {
    id: '7',
    holiday: 'Christmas',
    month: 12,
    day: 25,
    salesByYear: {
      2024: 0,
      2023: 22000,
      2022: 19500,
      2021: 17900,
      2020: 16500,
    },
  },
]

const formatDate = (date: Date) => date.toISOString().slice(0, 10)

const toDateLabel = (month: number, day: number) =>
  `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const getNextOccurrence = (holiday: HolidayData, baseDate: Date) => {
  const thisYear = baseDate.getFullYear()
  const thisYearDate = new Date(thisYear, holiday.month - 1, holiday.day)
  if (thisYearDate >= baseDate) return thisYearDate
  return new Date(thisYear + 1, holiday.month - 1, holiday.day)
}

const CHART_RANGE_OPTIONS = {
  '1y': { years: 1 },
  '3y': { years: 3 },
  '5y': { years: 5 },
} as const

type ChartRange = keyof typeof CHART_RANGE_OPTIONS

const HOLIDAY_FACTORS = {
  'kibo-north': 1.08,
  'kibo-south': 0.92,
} as const

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
        ctx.fillText(`$${value.toLocaleString()}`, position.x, labelY)
        ctx.restore()
      })
    })
  },
}

ChartJS.register(valueLabelPlugin as Plugin<'bar'>)

export function HolidayComparison() {
  const { selectedStoreId, language } = useStore()
  const text = getTranslation(language)
  const [selectedHolidayId, setSelectedHolidayId] = useState(mockHolidayData[0].id)
  const [chartRange, setChartRange] = useState<ChartRange>('1y')
  const selectedStore = STORES.find((store) => store.id === selectedStoreId)

  const scopedHolidayData = useMemo(() => {
    return mockHolidayData.map((holiday) => {
      const salesByYear = Object.entries(holiday.salesByYear).reduce<SalesByYear>((acc, [year, value]) => {
        if (selectedStoreId === 'all') {
          const north = Math.round(value * HOLIDAY_FACTORS['kibo-north'])
          const south = Math.round(value * HOLIDAY_FACTORS['kibo-south'])
          acc[Number(year)] = north + south
          return acc
        }

        const factor = HOLIDAY_FACTORS[selectedStoreId]
        acc[Number(year)] = Math.round(value * factor)
        return acc
      }, {})

      return {
        ...holiday,
        salesByYear,
      }
    })
  }, [selectedStoreId])

  const today = useMemo(() => new Date(), [])

  const upcomingHolidays = useMemo(() => {
    const oneMonthLater = new Date(today)
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)

    return scopedHolidayData
      .map((holiday) => {
        const nextDate = getNextOccurrence(holiday, today)
        return {
          ...holiday,
          nextDate,
        }
      })
      .filter((holiday) => holiday.nextDate <= oneMonthLater)
      .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())
  }, [today, scopedHolidayData])

  const selectedHoliday = useMemo(() => {
    const fallback = upcomingHolidays[0]?.id ?? mockHolidayData[0].id
    const selected = scopedHolidayData.find((holiday) => holiday.id === selectedHolidayId)
    return selected ?? scopedHolidayData.find((holiday) => holiday.id === fallback) ?? scopedHolidayData[0]
  }, [selectedHolidayId, upcomingHolidays, scopedHolidayData])

  const historicalRows = useMemo(() => {
    return Object.entries(selectedHoliday.salesByYear)
      .map(([year, sales]) => ({
        id: `${selectedHoliday.id}-${year}`,
        year: Number(year),
        date: `${year}-${toDateLabel(selectedHoliday.month, selectedHoliday.day)}`,
        sales,
      }))
      .sort((a, b) => b.year - a.year)
  }, [selectedHoliday])

  const chartData = useMemo(() => {
    const availableYearsDesc = Object.keys(selectedHoliday.salesByYear)
      .map(Number)
      .sort((a, b) => b - a)
    const latestYear = availableYearsDesc[0]

    let years: number[] = []
    if (chartRange === '1y') {
      const previousYear = latestYear - 1
      years = availableYearsDesc.includes(previousYear) ? [previousYear] : [latestYear]
    } else {
      years = availableYearsDesc.slice(0, CHART_RANGE_OPTIONS[chartRange].years).sort((a, b) => a - b)
    }

    return {
      labels: years.map(String),
      datasets: [
        {
          label: `${selectedHoliday.holiday} 매출`,
          data: years.map((year) => selectedHoliday.salesByYear[year]),
          backgroundColor: 'oklch(0.527 0.154 150.069)',
          borderRadius: 4,
        },
      ],
    }
  }, [selectedHoliday, chartRange])

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
            `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`,
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
          callback: (value: number | string) => `$${Number(value).toLocaleString()}`,
        },
      },
    },
  }

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
          <CardTitle className="text-base flex items-center gap-2">
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
                      variant={selectedHoliday.id === holiday.id ? 'default' : 'outline'}
                      onClick={() => setSelectedHolidayId(holiday.id)}
                      className="h-auto py-2"
                    >
                      {holiday.holiday} ({formatDate(holiday.nextDate)})
                    </Button>
                  ))
                ) : (
                  <Badge variant="secondary">{text.holiday.noneUpcoming}</Badge>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">{text.holiday.allTitle}</p>
              <Select value={selectedHoliday.id} onValueChange={setSelectedHolidayId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={text.holiday.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {scopedHolidayData.map((holiday) => (
                    <SelectItem key={holiday.id} value={holiday.id}>
                      {holiday.holiday}
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
                  <CardTitle>{text.holiday.trendTitle.replace('{holiday}', selectedHoliday.holiday)}</CardTitle>
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
            <div className="mb-3 text-sm text-muted-foreground">
              {text.holiday.recentDate}: {toDateLabel(selectedHoliday.month, selectedHoliday.day)}
            </div>
            <div className="h-[400px]">
              <Bar data={chartData} options={chartOptions as object} plugins={[valueLabelPlugin]} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{text.holiday.historyTitle.replace('{holiday}', selectedHoliday.holiday)}</CardTitle>
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
                  {historicalRows.length > 0 ? (
                    historicalRows.map((row) => {
                      const previousYearSales = selectedHoliday.salesByYear[row.year - 1]
                      const yoy = previousYearSales
                        ? ((row.sales - previousYearSales) / previousYearSales) * 100
                        : null

                      return (
                        <TableRow key={row.id}>
                          <TableCell>{row.year}</TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell className="text-right">${row.sales.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {yoy === null ? (
                              <Badge variant="secondary">-</Badge>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 font-medium ${
                                  yoy >= 0 ? 'text-success' : 'text-destructive'
                                }`}
                              >
                                {yoy >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                {yoy >= 0 ? '+' : ''}
                                {yoy.toFixed(1)}%
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
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
