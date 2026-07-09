'use client'

import { useRef, useState } from 'react'
import { UploadCloud, RefreshCw, Database, CheckCircle2, FileText } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

type UploadStatus = 'idle' | 'selected' | 'uploading' | 'done'

type PreviewRow = {
  date: string
  storeId: string
  instorePayment: string
  cardPayment: string
  uberEats: string
  doorDash: string
}

const previewRows: PreviewRow[] = [
  { date: '2026-06-20', storeId: 'st-clair', instorePayment: '1,948.76', cardPayment: '2,201.72', uberEats: '3,171.35', doorDash: '228.08' },
  { date: '2026-06-21', storeId: 'woodbridge', instorePayment: '1,596.69', cardPayment: '1,785.88', uberEats: '3,560.42', doorDash: '2,794.68' },
  { date: '2026-06-22', storeId: 'st-clair', instorePayment: '3,087.40', cardPayment: '3,402.40', uberEats: '2,756.06', doorDash: '623.22' },
  { date: '2026-06-23', storeId: 'woodbridge', instorePayment: '1,397.00', cardPayment: '1,541.30', uberEats: '3,019.10', doorDash: '636.36' },
  { date: '2026-06-24', storeId: 'st-clair', instorePayment: '1,413.99', cardPayment: '1,532.99', uberEats: '3,088.04', doorDash: '1,053.09' },
]

export default function DataLoadPage() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragActive, setIsDragActive] = useState(false)

  const progressValue = status === 'uploading' ? 50 : status === 'done' ? 100 : status === 'selected' ? 0 : 0

  async function handleUpload(file: File) {
    setErrorMessage('')

    if (!file) {
      setErrorMessage('파일이 선택되지 않았습니다.')
      setStatus('idle')
      return
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMessage('CSV 파일만 업로드할 수 있습니다.')
      setStatus('idle')
      return
    }

    setFileName(file.name)
    setFileSize(file.size)
    setStatus('selected')
  }

  async function handleSync() {
    if (status !== 'selected') return

    setErrorMessage('')
    setStatus('uploading')

    await new Promise((resolve) => setTimeout(resolve, 900))

    setStatus('done')
  }

  function handleReset() {
    setStatus('idle')
    setFileName('')
    setFileSize(0)
    setErrorMessage('')
    setIsDragActive(false)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  function openFilePicker() {
    inputRef.current?.click()
  }

  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />

      <div className="flex flex-col lg:pl-64">
        <Header />

        <PageContainer>
          <div className="space-y-8 pb-10">
            <section className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight">데이터 로드 센터</h1>
              <p className="text-muted-foreground">영업 실적 CSV 파일을 업로드하여 데이터베이스에 동기화하세요.</p>
            </section>

            <section
              className={cn(
                'cursor-pointer rounded-2xl border-2 border-dashed bg-muted/20 px-6 py-12 text-center transition-colors',
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-muted/30',
              )}
              onClick={openFilePicker}
              onDragOver={(event) => {
                event.preventDefault()
                setIsDragActive(true)
              }}
              onDragLeave={() => setIsDragActive(false)}
              onDrop={(event) => {
                event.preventDefault()
                setIsDragActive(false)
                const droppedFile = event.dataTransfer.files?.[0]
                if (droppedFile) {
                  void handleUpload(droppedFile)
                }
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0]
                  if (selectedFile) {
                    void handleUpload(selectedFile)
                  }
                }}
              />

              <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-medium">클릭하거나 파일을 이곳으로 드래그하여 업로드하세요 (CSV 파일만 지원)</p>
                  <p className="text-sm text-muted-foreground">업로드 후 선택 상태에서 DB 동기화 버튼을 사용할 수 있습니다.</p>
                </div>
              </div>
            </section>

            {status !== 'idle' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    업로드 상태
                  </CardTitle>
                  <CardDescription>파일 선택, 업로드, 완료 상태를 확인할 수 있습니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={progressValue} />

                  {status === 'selected' && (
                    <div className="rounded-xl border bg-muted/30 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{fileName}</p>
                          <p className="text-sm text-muted-foreground">{(fileSize / 1024).toFixed(1)} KB</p>
                        </div>
                        <Button variant="outline" onClick={handleReset}>
                          초기화
                        </Button>
                      </div>
                    </div>
                  )}

                  {status === 'uploading' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      DB에 데이터를 동기화하는 중입니다.
                    </div>
                  )}

                  {status === 'done' && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      업로드가 완료되었습니다. 데이터가 성공적으로 저장되었습니다.
                    </div>
                  )}

                  {errorMessage && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                      {errorMessage}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleSync}
                    disabled={status !== 'selected'}
                    className="gap-2"
                  >
                    <Database className="h-4 w-4" />
                    DB에 최종 적재 (Sync to Database)
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    초기화
                  </Button>
                </CardFooter>
              </Card>
            ) : null}

            {status === 'selected' ? (
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">데이터 미리보기</CardTitle>
                      <CardDescription>실제 CSV 파싱 대신 더미 데이터 5줄을 표시합니다.</CardDescription>
                    </div>
                    <Button variant="outline" onClick={handleReset}>
                      초기화
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>날짜(date)</TableHead>
                        <TableHead>지점(store_id)</TableHead>
                        <TableHead>매장결제(instore_payment)</TableHead>
                        <TableHead>카드결제(card_payment)</TableHead>
                        <TableHead>우버이츠(uber_eats)</TableHead>
                        <TableHead>도어대시(door_dash)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row) => (
                        <TableRow key={`${row.date}-${row.storeId}`}>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.storeId}</TableCell>
                          <TableCell>{row.instorePayment}</TableCell>
                          <TableCell>{row.cardPayment}</TableCell>
                          <TableCell>{row.uberEats}</TableCell>
                          <TableCell>{row.doorDash}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </PageContainer>
      </div>
    </div>
  )
}
