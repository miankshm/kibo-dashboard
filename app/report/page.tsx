'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Download, Loader2, Mail } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { buildApiUrl, requestJson } from '@/lib/api/client'
import type { DateRangeReportData } from '@/lib/types'
import { useStore } from '@/store/useStore'

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(value)
}

function formatPercent(value: number | null) {
  return value === null ? '-' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

function reportFilename(startDate: string, endDate: string) {
  return `${startDate.replaceAll('-', '')}-${endDate.replaceAll('-', '')}.pdf`
}

export default function ReportPage() {
  const today = new Date()
  const initialStartDate = toDateKey(startOfMonth(today))
  const initialEndDate = toDateKey(today)
  const reportRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const selectedStoreId = useStore((state) => state.selectedStoreId)
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)
  const [report, setReport] = useState<DateRangeReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isEmailOpen, setIsEmailOpen] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')

  async function loadReport() {
    if (startDate > endDate) {
      toast({ variant: 'destructive', title: '날짜 범위를 확인해 주세요.' })
      return
    }

    setIsLoading(true)
    try {
      const data = await requestJson<DateRangeReportData>(buildApiUrl('/api/v1/reports', { storeKey: selectedStoreId, startDate, endDate }))
      setReport(data)
    } catch (error) {
      setReport(null)
      toast({ variant: 'destructive', title: '리포트를 불러오지 못했습니다.', description: error instanceof Error ? error.message : undefined })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  // The selected store is shared with the dashboard header.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreId])

  function applyPreset(days: number) {
    setStartDate(toDateKey(addDays(today, -(days - 1))))
    setEndDate(toDateKey(today))
  }

  async function createPdf() {
    const node = reportRef.current
    if (!node || !report) throw new Error('Report is not ready.')

    const [{ toJpeg }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')])
    let image: string
    try {
      image = await toJpeg(node, { backgroundColor: '#ffffff', cacheBust: true, pixelRatio: 2, quality: 0.82 })
    } catch {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(node, { backgroundColor: '#ffffff', scale: 2 })
      image = canvas.toDataURL('image/jpeg', 0.82)
    }
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const imageProperties = pdf.getImageProperties(image)
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imageHeight = (imageProperties.height * pageWidth) / imageProperties.width
    let position = 0

    pdf.addImage(image, 'JPEG', 0, position, pageWidth, imageHeight)
    for (let remaining = imageHeight - pageHeight; remaining > 0; remaining -= pageHeight) {
      position -= pageHeight
      pdf.addPage()
      pdf.addImage(image, 'JPEG', 0, position, pageWidth, imageHeight)
    }

    return pdf.output('blob')
  }

  async function handleDownload() {
    try {
      setIsExporting(true)
      const pdf = await createPdf()
      const url = URL.createObjectURL(pdf)
      const link = document.createElement('a')
      link.href = url
      link.download = reportFilename(startDate, endDate)
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast({ variant: 'destructive', title: 'PDF를 만들지 못했습니다.', description: error instanceof Error ? error.message : undefined })
    } finally {
      setIsExporting(false)
    }
  }

  async function handleEmail() {
    try {
      setIsExporting(true)
      const pdf = await createPdf()
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
        reader.onerror = () => reject(new Error('PDF를 읽지 못했습니다.'))
        reader.readAsDataURL(pdf)
      })
      const response = await fetch('/api/reports/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recipientEmail, filename: reportFilename(startDate, endDate), pdfBase64 }),
      })
      const payload = await response.json() as { success: boolean; message?: string }
      if (!response.ok || !payload.success) throw new Error(payload.message ?? '메일 전송에 실패했습니다.')
      setIsEmailOpen(false)
      toast({ title: '리포트를 이메일로 전송했습니다.', description: recipientEmail })
    } catch (error) {
      toast({ variant: 'destructive', title: '메일을 전송하지 못했습니다.', description: error instanceof Error ? error.message : undefined })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />

      <div className="flex flex-col lg:pl-64">
        <Header />

        <PageContainer>
          <div className="space-y-8">
            <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">리포트</h1>
                <p className="text-muted-foreground">기간별 매출 종합 분석 리포트</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleDownload} disabled={!report || isLoading || isExporting}>
                  {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
                  PDF 다운로드
                </Button>
                <Button onClick={() => setIsEmailOpen(true)} disabled={!report || isLoading || isExporting}>
                  <Mail /> 이메일 전송
                </Button>
              </div>
            </section>

            <Card>
              <CardContent className="flex flex-col gap-4 py-6 xl:flex-row xl:items-end">
                <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto_1fr] sm:items-center">
                  <Label className="font-medium">기간 선택</Label>
                  <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                  <span className="hidden text-muted-foreground sm:block">~</span>
                  <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2 xl:ml-auto">
                  <Button size="sm" variant="outline" onClick={() => applyPreset(7)}>이번 주</Button>
                  <Button size="sm" variant="outline" onClick={() => { setStartDate(initialStartDate); setEndDate(initialEndDate) }}>이번 달</Button>
                  <Button size="sm" variant="outline" onClick={() => applyPreset(90)}>3개월</Button>
                  <Button size="sm" variant="outline" onClick={() => applyPreset(180)}>6개월</Button>
                  <Button size="sm" onClick={loadReport} disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : <CalendarDays />} 조회</Button>
                </div>
              </CardContent>
            </Card>

            <div ref={reportRef} className="space-y-8 bg-background p-1">
              <section className="border-b pb-5">
                <p className="text-sm font-medium text-primary">KIBO SALES REPORT</p>
                <h2 className="mt-1 text-2xl font-bold">{startDate.replaceAll('-', '.')} - {endDate.replaceAll('-', '.')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">생성일 {formatDate(toDateKey(new Date()))} · 선택 지점 {selectedStoreId === 'all' ? '전체 지점' : selectedStoreId}</p>
              </section>

              {isLoading ? (
                <div className="flex h-56 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 animate-spin" /> 리포트를 생성하고 있습니다.</div>
              ) : !report ? (
                <div className="flex h-56 items-center justify-center text-muted-foreground">표시할 리포트 데이터가 없습니다.</div>
              ) : (
                <ReportContents report={report} />
              )}
            </div>
          </div>
        </PageContainer>
      </div>

      <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>리포트 이메일 전송</DialogTitle>
            <DialogDescription>{reportFilename(startDate, endDate)} 파일을 첨부해 전송합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="report-recipient">받는 이메일</Label>
            <Input id="report-recipient" type="email" autoComplete="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="name@example.com" />
          </div>
          <DialogFooter>
            <Button onClick={handleEmail} disabled={!recipientEmail || isExporting}>{isExporting ? <Loader2 className="animate-spin" /> : <Mail />} 전송</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReportContents({ report }: { report: DateRangeReportData }) {
  const channelRows = [
    ['카드 매출', report.channels.cardSales], ['현금 매출', report.channels.cashSales], ['Uber Eats', report.channels.uberEatsSales], ['DoorDash', report.channels.doorDashSales], ['Cash & Carry', report.channels.cashAndCarrySales], ['팁 / Paid Out', report.channels.tips],
  ]
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="총 매출" value={formatCurrency(report.totals.totalSales)} detail={`전 기간 대비 ${formatPercent(report.growthRate)}`} />
        <MetricCard title="순 매출" value={formatCurrency(report.totals.netSales)} detail={`전 기간 ${formatCurrency(report.previousTotals.netSales)}`} />
        <MetricCard title="예상 현금" value={formatCurrency(report.totals.expectedCash)} detail={`실제 현금 ${formatCurrency(report.totals.actualCash)}`} />
        <MetricCard title="현금 차이" value={formatCurrency(report.totals.cashDifference)} detail={`예상 현금 대비 ${formatPercent(report.totals.expectedCash === 0 ? null : report.totals.cashDifference / report.totals.expectedCash * 100)}`} />
      </section>

      <ReportTable title="매출 채널 분석" headers={['채널', '금액', '구성비']} rows={channelRows.map(([label, value]) => [String(label), formatCurrency(Number(value)), `${report.totals.totalSales === 0 ? 0 : (Number(value) / report.totals.totalSales * 100).toFixed(1)}%`])} />
      <ReportTable title="일별 매출 및 현금 흐름" headers={['일자', '총 매출', '순 매출', '예상 현금', '실제 현금', '차이']} rows={report.daily.map((row) => [formatDate(row.startDate), formatCurrency(row.totalSales), formatCurrency(row.netSales), formatCurrency(row.expectedCash), formatCurrency(row.actualCash), formatCurrency(row.cashDifference)])} />
      <ReportTable title="주간 매출 요약" headers={['주 시작일', '총 매출', '순 매출', '예상 현금', '실제 현금', '차이']} rows={report.weekly.map((row) => [formatDate(row.startDate), formatCurrency(row.totalSales), formatCurrency(row.netSales), formatCurrency(row.expectedCash), formatCurrency(row.actualCash), formatCurrency(row.cashDifference)])} />
      <ReportTable title="월간 매출 요약" headers={['월', '총 매출', '순 매출', '예상 현금', '실제 현금', '차이']} rows={report.monthly.map((row) => [row.label, formatCurrency(row.totalSales), formatCurrency(row.netSales), formatCurrency(row.expectedCash), formatCurrency(row.actualCash), formatCurrency(row.cashDifference)])} />
      <ReportTable title="공휴일 연도별 비교" headers={['공휴일', '일자', '매출', '전년 매출', '전년 대비']} rows={report.holidays.length > 0 ? report.holidays.map((row) => [row.name, formatDate(row.date), formatCurrency(row.sales), row.previousYearSales === null ? '-' : formatCurrency(row.previousYearSales), formatPercent(row.yearOverYear)]) : [['해당 기간에 등록된 공휴일이 없습니다.', '', '', '', '']]} />
    </>
  )
}

function MetricCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>
}

function ReportTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return <section className="space-y-3"><h3 className="text-lg font-semibold">{title}</h3><div className="overflow-hidden rounded-md border"><table className="w-full text-sm"><thead className="bg-muted/60"><tr>{headers.map((header) => <th key={header} className="px-3 py-2 text-right font-medium first:text-left">{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={`${title}-${rowIndex}`} className="border-t">{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2 text-right tabular-nums first:text-left first:font-medium">{cell}</td>)}</tr>)}</tbody></table></div></section>
}
