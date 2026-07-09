'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, Loader2, Search } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { STORES, type StoreId } from '@/store/useStore'
import { getSalesList } from '@/lib/api/sales'
import type { SaleRecord, SalesMode } from '@/lib/types'

type SearchStore = StoreId

function formatCurrency(value: number) {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDisplayDate(date: Date | string) {
  if (typeof date === 'string') {
    return format(new Date(`${date}T00:00:00`), 'yyyy-MM-dd')
  }

  return format(date, 'yyyy-MM-dd')
}

function getStoreLabel(storeId: SearchStore) {
  const store = STORES.find((item) => item.id === storeId)
  return store?.name.ko ?? storeId
}

function getRecordStoreLabel(storeKey: SaleRecord['storeKey']) {
  if (storeKey === 'st-clair') return 'St. Clair'
  if (storeKey === 'woodbridge') return 'Woodbridge'
  return storeKey
}

export default function SalesSearchPage() {
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const value = new Date()
    value.setDate(value.getDate() - 7)
    return value
  })
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [selectedStore, setSelectedStore] = useState<SearchStore>('all')
  const [salesMode, setSalesMode] = useState<SalesMode>('gross')
  const [results, setResults] = useState<SaleRecord[]>([])
  const [selectedRow, setSelectedRow] = useState<SaleRecord | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const hasSearched = useMemo(() => results.length > 0 || errorMessage !== null, [results.length, errorMessage])

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      setErrorMessage('시작일과 종료일을 모두 선택해주세요.')
      setResults([])
      return
    }

    if (startDate > endDate) {
      setErrorMessage('시작일은 종료일보다 늦을 수 없습니다.')
      setResults([])
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await getSalesList({
        storeKey: selectedStore,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        limit: 500,
        sortOrder: 'desc',
      })

      setResults(response.items)
    } catch {
      setResults([])
      setErrorMessage('매출 데이터를 조회하지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  const openDetail = (row: SaleRecord) => {
    setSelectedRow(row)
    setIsDetailOpen(true)
  }

  const selectedDeliveryTotal = selectedRow
    ? selectedRow.uberEatsSales + selectedRow.doorDashSales
    : 0

  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />

      <div className="flex flex-col lg:pl-64">
        <Header />

        <PageContainer>
          <div className="space-y-8 pb-10">
            <section className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">매출 검색</h1>
              <p className="text-muted-foreground">기간별 매출 데이터를 검색하고 조회할 수 있습니다.</p>
            </section>

            <Card>
              <CardHeader>
                <CardTitle>검색 필터</CardTitle>
                <CardDescription>기간, 매장, 매출 기준을 선택한 뒤 검색 버튼을 눌러주세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">시작일</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? formatDisplayDate(startDate) : '시작일 선택'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">종료일</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !endDate && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? formatDisplayDate(endDate) : '종료일 선택'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">매장 선택</p>
                    <Select value={selectedStore} onValueChange={(value) => setSelectedStore(value as SearchStore)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="매장 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {STORES.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name.ko}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">매출 기준</p>
                    <Select value={salesMode} onValueChange={(value) => setSalesMode(value as SalesMode)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gross">Gross</SelectItem>
                        <SelectItem value="net">Net</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button className="gap-2" onClick={handleSearch} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    검색
                  </Button>
                </div>

                {errorMessage ? (
                  <Alert variant="destructive">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>검색 결과</CardTitle>
                  <CardDescription>
                    {hasSearched
                      ? `${results.length}건 조회됨 · 표시 기준: ${salesMode === 'gross' ? 'Gross' : 'Net'}`
                      : '조건을 선택하고 검색 버튼을 눌러주세요.'}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    데이터를 불러오는 중입니다.
                  </div>
                ) : results.length === 0 ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Search className="h-5 w-5" />
                      </EmptyMedia>
                      <EmptyTitle>조회된 매출 데이터가 없습니다.</EmptyTitle>
                      <EmptyDescription>
                        검색 조건을 조정한 뒤 다시 조회해 주세요.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>날짜</TableHead>
                        <TableHead>매장</TableHead>
                        <TableHead className={cn('text-right', salesMode === 'gross' && 'text-primary')}>총매출(Gross)</TableHead>
                        <TableHead className={cn('text-right', salesMode === 'net' && 'text-primary')}>순매출(Net)</TableHead>
                        <TableHead className="text-right">카드결제</TableHead>
                        <TableHead className="text-right">현금결제</TableHead>
                        <TableHead className="text-right">배달앱</TableHead>
                        <TableHead className="text-right">Cash & Carry</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((row) => (
                        <TableRow
                          key={row.id}
                          onClick={() => openDetail(row)}
                          className="cursor-pointer"
                        >
                          <TableCell>{formatDisplayDate(row.salesDate)}</TableCell>
                          <TableCell>{getRecordStoreLabel(row.storeKey)}</TableCell>
                          <TableCell className={cn('text-right', salesMode === 'gross' && 'font-semibold text-primary')}>
                            {formatCurrency(row.totalSales)}
                          </TableCell>
                          <TableCell className={cn('text-right', salesMode === 'net' && 'font-semibold text-primary')}>
                            {formatCurrency(row.netSales)}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(row.cardSales)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.cashSales)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.uberEatsSales + row.doorDashSales)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.cashAndCarrySales)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>
                  {selectedRow
                    ? `${formatDisplayDate(selectedRow.salesDate)} · ${getRecordStoreLabel(selectedRow.storeKey)}`
                    : '매출 상세'}
                </SheetTitle>
                <SheetDescription>선택한 날짜의 실제 매출 상세 데이터입니다.</SheetDescription>
              </SheetHeader>

              {selectedRow ? (
                <div className="space-y-3 px-4 pb-6">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">조회 매장</span>
                    <Badge variant="secondary">{getStoreLabel(selectedRow.storeKey)}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Gross</p>
                        <p className="text-sm font-semibold">{formatCurrency(selectedRow.totalSales)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Net</p>
                        <p className="text-sm font-semibold">{formatCurrency(selectedRow.netSales)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">카드결제</p>
                        <p className="text-sm font-semibold">{formatCurrency(selectedRow.cardSales)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">현금결제</p>
                        <p className="text-sm font-semibold">{formatCurrency(selectedRow.cashSales)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Uber Eats</p>
                        <p className="text-sm font-semibold">{formatCurrency(selectedRow.uberEatsSales)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">DoorDash</p>
                        <p className="text-sm font-semibold">{formatCurrency(selectedRow.doorDashSales)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">배달앱 합계</p>
                        <p className="text-sm font-semibold">{formatCurrency(selectedDeliveryTotal)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Cash & Carry</p>
                        <p className="text-sm font-semibold">{formatCurrency(selectedRow.cashAndCarrySales)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Paid Out</p>
                        <p className="text-sm font-semibold">{formatCurrency(selectedRow.tips)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">예상 마감 현금</p>
                        <p className="text-sm font-semibold">{formatCurrency(selectedRow.expectedCash)}</p>
                      </CardContent>
                    </Card>
                    <Card className="col-span-2">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">실제 마감 현금</p>
                        <p className="text-sm font-semibold">{formatCurrency(selectedRow.actualClosingCash)}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : null}
            </SheetContent>
          </Sheet>
        </PageContainer>
      </div>
    </div>
  )
}
