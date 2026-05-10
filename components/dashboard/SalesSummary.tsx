'use client'

import { useMemo } from 'react'
import {
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
import { Line } from 'react-chartjs-2'
import { TrendingUp, TrendingDown, CreditCard, Banknote, Truck, Store as StoreIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWorkflow } from '@/contexts/workflow-context'
import { useStore } from '@/store/useStore'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

// Mock 데이터
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

const mockBreakdown = {
  instore: 45,
  card: 35,
  cash: 15,
  uberEats: 12,
  doorDash: 8,
  cashAndCarry: 5,
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
          <span>{isPositive ? '+' : ''}{change}% 전일 대비</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function SalesSummary() {
  const { showGrossSales, toggleSalesMode, selectedPeriod, setSelectedPeriod } = useWorkflow()
  const { selectedStoreId } = useStore()

  const chartData = useMemo(() => {
    const periodData = mockSalesData[selectedPeriod]
    return {
      labels: periodData.labels,
      datasets: [
        {
          label: showGrossSales ? '총매출 (Gross)' : '순매출 (Net)',
          data: showGrossSales ? periodData.data : periodData.data.map((v) => v * 0.85),
          borderColor: 'oklch(0.527 0.154 150.069)',
          backgroundColor: 'oklch(0.527 0.154 150.069 / 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'oklch(0.527 0.154 150.069)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    }
  }, [selectedPeriod, showGrossSales])

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
        displayColors: false,
        callbacks: {
          label: (context: { parsed: { y: number } }) => `$${context.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'oklch(0.556 0 0)',
        },
      },
      y: {
        grid: {
          color: 'oklch(0.922 0 0)',
        },
        ticks: {
          color: 'oklch(0.556 0 0)',
          callback: (value: number | string) => `$${Number(value).toLocaleString()}`,
        },
      },
    },
  }

  const totalSales = mockSalesData[selectedPeriod].data.reduce((a, b) => a + b, 0)
  const displayTotal = showGrossSales ? totalSales : totalSales * 0.85

  return (
    <section id="sales" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">매출 요약</h2>
          <p className="text-muted-foreground">
            {selectedStoreId === 'all' ? '전체 지점' : STORES.find(s => s.id === selectedStoreId)?.name} 매출 현황
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
              {showGrossSales ? '총매출 (Gross)' : '순매출 (Net)'}
            </Label>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SalesCard
          title="매장 방문"
          value={`$${(displayTotal * mockBreakdown.instore / 100).toLocaleString()}`}
          change={8.2}
          icon={StoreIcon}
        />
        <SalesCard
          title="카드 결제"
          value={`$${(displayTotal * mockBreakdown.card / 100).toLocaleString()}`}
          change={12.5}
          icon={CreditCard}
        />
        <SalesCard
          title="현금 결제"
          value={`$${(displayTotal * mockBreakdown.cash / 100).toLocaleString()}`}
          change={-3.1}
          icon={Banknote}
        />
        <SalesCard
          title="배달앱 (Uber+DoorDash)"
          value={`$${(displayTotal * (mockBreakdown.uberEats + mockBreakdown.doorDash) / 100).toLocaleString()}`}
          change={15.8}
          icon={Truck}
        />
      </div>

      {/* Chart Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>매출 추이</CardTitle>
              <CardDescription>
                기간별 매출 변동 그래프
              </CardDescription>
            </div>
            <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as 'daily' | 'weekly' | 'monthly')}>
              <TabsList>
                <TabsTrigger value="daily">일별</TabsTrigger>
                <TabsTrigger value="weekly">주별</TabsTrigger>
                <TabsTrigger value="monthly">월별</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Line data={chartData} options={chartOptions as object} />
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

const STORES = [
  { id: 'all', name: '전체 보기' },
  { id: 'kibo-north', name: 'Kibo Sushi North' },
  { id: 'kibo-south', name: 'Kibo Sushi South' },
]
