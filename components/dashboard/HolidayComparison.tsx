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
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/store/useStore'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

// Mock 홀리데이 데이터
interface HolidayData {
  id: string
  holiday: string
  date2024: string
  sales2024: number
  date2023: string
  sales2023: number
  date2022: string
  sales2022: number
  yoyChange: number
}

const mockHolidayData: HolidayData[] = [
  {
    id: '1',
    holiday: "New Year's Day",
    date2024: '2024-01-01',
    sales2024: 8500,
    date2023: '2023-01-01',
    sales2023: 7800,
    date2022: '2022-01-01',
    sales2022: 7200,
    yoyChange: 9.0,
  },
  {
    id: '2',
    holiday: "Valentine's Day",
    date2024: '2024-02-14',
    sales2024: 12300,
    date2023: '2023-02-14',
    sales2023: 10500,
    date2022: '2022-02-14',
    sales2022: 9800,
    yoyChange: 17.1,
  },
  {
    id: '3',
    holiday: 'Easter',
    date2024: '2024-03-31',
    sales2024: 6200,
    date2023: '2023-04-09',
    sales2023: 5900,
    date2022: '2022-04-17',
    sales2022: 5500,
    yoyChange: 5.1,
  },
  {
    id: '4',
    holiday: "Mother's Day",
    date2024: '2024-05-12',
    sales2024: 15800,
    date2023: '2023-05-14',
    sales2023: 14200,
    date2022: '2022-05-08',
    sales2022: 12800,
    yoyChange: 11.3,
  },
  {
    id: '5',
    holiday: "Father's Day",
    date2024: '2024-06-16',
    sales2024: 11200,
    date2023: '2023-06-18',
    sales2023: 10800,
    date2022: '2022-06-19',
    sales2022: 9900,
    yoyChange: 3.7,
  },
  {
    id: '6',
    holiday: 'Thanksgiving',
    date2024: '2024-11-28',
    sales2024: 0,
    date2023: '2023-11-23',
    sales2023: 18500,
    date2022: '2022-11-24',
    sales2022: 16800,
    yoyChange: -100,
  },
  {
    id: '7',
    holiday: 'Christmas',
    date2024: '2024-12-25',
    sales2024: 0,
    date2023: '2023-12-25',
    sales2023: 22000,
    date2022: '2022-12-25',
    sales2022: 19500,
    yoyChange: -100,
  },
]

// 다가오는 홀리데이
const upcomingHolidays = mockHolidayData.filter((h) => h.sales2024 === 0)

const columns: ColumnDef<HolidayData>[] = [
  {
    accessorKey: 'holiday',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-0 hover:bg-transparent"
      >
        홀리데이
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="font-medium">{row.getValue('holiday')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'sales2024',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-0 hover:bg-transparent"
      >
        2024
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = row.getValue('sales2024') as number
      return amount > 0 ? `$${amount.toLocaleString()}` : <Badge variant="secondary">예정</Badge>
    },
  },
  {
    accessorKey: 'sales2023',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-0 hover:bg-transparent"
      >
        2023
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = row.getValue('sales2023') as number
      return `$${amount.toLocaleString()}`
    },
  },
  {
    accessorKey: 'sales2022',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-0 hover:bg-transparent"
      >
        2022
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = row.getValue('sales2022') as number
      return `$${amount.toLocaleString()}`
    },
  },
  {
    accessorKey: 'yoyChange',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-0 hover:bg-transparent"
      >
        YoY 변화
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const change = row.getValue('yoyChange') as number
      if (change === -100) return <Badge variant="secondary">예정</Badge>
      const isPositive = change >= 0
      return (
        <div className={`flex items-center gap-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span className="font-medium">{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
        </div>
      )
    },
  },
]

export function HolidayComparison() {
  const { selectedStoreId } = useStore()
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data: mockHolidayData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  })

  const chartData = useMemo(() => {
    const completedHolidays = mockHolidayData.filter((h) => h.sales2024 > 0)
    return {
      labels: completedHolidays.map((h) => h.holiday),
      datasets: [
        {
          label: '2024',
          data: completedHolidays.map((h) => h.sales2024),
          backgroundColor: 'oklch(0.527 0.154 150.069)',
          borderRadius: 4,
        },
        {
          label: '2023',
          data: completedHolidays.map((h) => h.sales2023),
          backgroundColor: 'oklch(0.65 0.13 150)',
          borderRadius: 4,
        },
        {
          label: '2022',
          data: completedHolidays.map((h) => h.sales2022),
          backgroundColor: 'oklch(0.75 0.1 150)',
          borderRadius: 4,
        },
      ],
    }
  }, [])

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
        <h2 className="text-2xl font-bold tracking-tight">홀리데이 매출 비교</h2>
        <p className="text-muted-foreground">
          과거 1~2년 전 동기 홀리데이 매출 비교 분석 - {selectedStoreId === 'all' ? '전체 지점' : selectedStoreId}
        </p>
      </div>

      {/* Upcoming Holidays Alert */}
      {upcomingHolidays.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              다가오는 홀리데이
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {upcomingHolidays.map((h) => (
                <Badge key={h.id} variant="outline" className="text-sm">
                  {h.holiday} ({h.date2024})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">차트 뷰</TabsTrigger>
          <TabsTrigger value="table">테이블 뷰</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>연도별 홀리데이 매출 비교</CardTitle>
              <CardDescription>
                동일 홀리데이의 연도별 매출 볼륨 시각화
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <Bar data={chartData} options={chartOptions as object} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>홀리데이 매출 상세 테이블</CardTitle>
              <CardDescription>
                컬럼 헤더를 클릭하여 정렬할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          데이터가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}
