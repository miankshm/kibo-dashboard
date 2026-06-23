'use client'

import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  CalendarDays,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Truck,
  Wallet,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useWorkflow } from '@/contexts/workflow-context'
import { format } from 'date-fns'
import { enUS, ko } from 'date-fns/locale'
import { useStore } from '@/store/useStore'
import { getTranslation } from '@/lib/i18n'

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number') {
    return '-'
  }

  return Math.round(value).toLocaleString()
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number') {
    return 'N/A'
  }

  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export function AIWidget() {
  const { drawerState, closeDrawer, aiAnalysis, generateAIReport, clearAIReport } = useWorkflow()
  const language = useStore((state) => state.language)
  const text = getTranslation(language)
  const dateLocale = language === 'ko' ? ko : enUS
  const insights = aiAnalysis.lastReportInsights

  const labels = {
    salesSummary: language === 'ko' ? '매출 요약' : 'Sales Summary',
    weekdayAnalysis: language === 'ko' ? '요일 분석' : 'Weekday Analysis',
    deliveryAnalysis: language === 'ko' ? '배달앱 분석' : 'Delivery Analysis',
    cashManagement: language === 'ko' ? '현금 관리' : 'Cash Management',
    aiInsight: language === 'ko' ? '핵심 인사이트' : 'AI Insight',
    totalSales: language === 'ko' ? '총매출' : 'Total Sales',
    netSales: language === 'ko' ? '순매출' : 'Net Sales',
    wowGrowth: language === 'ko' ? '전주 대비 증감률' : 'WoW Growth',
    topWeekday: language === 'ko' ? '최고 매출 요일' : 'Top Sales Day',
    weekdayShare: language === 'ko' ? '요일별 매출 비중' : 'Weekday Share',
    deliveryShare: language === 'ko' ? '배달앱 비중' : 'Delivery Share',
    feeImpact: language === 'ko' ? '수수료 영향' : 'Fee Impact',
    cashGap: language === 'ko' ? '예상 대비 현금 차액' : 'Cash Gap vs Expected',
    fallbackInsight: language === 'ko'
      ? '리포트 요약을 기반으로 핵심 인사이트를 정리했습니다.'
      : 'Core insights are summarized from the report.',
  }

  const aiInsightLines = insights
    ? [
        typeof insights.totalSalesGrowthRate === 'number'
          ? (insights.totalSalesGrowthRate >= 0
            ? (language === 'ko'
              ? `이번 기간 총매출은 직전 동기간 대비 ${insights.totalSalesGrowthRate.toFixed(1)}% 증가했습니다.`
              : `Total sales increased by ${insights.totalSalesGrowthRate.toFixed(1)}% versus the previous period.`)
            : (language === 'ko'
              ? `이번 기간 총매출은 직전 동기간 대비 ${Math.abs(insights.totalSalesGrowthRate).toFixed(1)}% 감소했습니다.`
              : `Total sales decreased by ${Math.abs(insights.totalSalesGrowthRate).toFixed(1)}% versus the previous period.`))
          : (language === 'ko'
            ? '비교 기준 데이터가 부족하여 증감률은 산출되지 않았습니다.'
            : 'Growth rate is unavailable due to limited baseline data.'),
        insights.topWeekday
          ? (language === 'ko'
            ? `${insights.topWeekday.weekday}이(가) 전체 매출의 ${insights.topWeekday.ratio.toFixed(1)}%로 가장 높은 비중을 차지했습니다.`
            : `${insights.topWeekday.weekday} recorded the largest share at ${insights.topWeekday.ratio.toFixed(1)}% of total sales.`)
          : (language === 'ko'
            ? '요일별 데이터가 부족하여 피크 요일을 특정하지 못했습니다.'
            : 'Insufficient daily data to determine a peak weekday.'),
        insights.delivery.deliveryShare >= 40
          ? (language === 'ko'
            ? `배달앱 매출 비중이 ${insights.delivery.deliveryShare.toFixed(1)}%로 높아 플랫폼 의존도가 큽니다.`
            : `Delivery channels account for ${insights.delivery.deliveryShare.toFixed(1)}%, indicating high platform dependency.`)
          : (language === 'ko'
            ? `배달앱 매출 비중은 ${insights.delivery.deliveryShare.toFixed(1)}% 수준으로 안정적입니다.`
            : `Delivery share is ${insights.delivery.deliveryShare.toFixed(1)}%, indicating balanced channel mix.`),
      ]
    : [labels.fallbackInsight]

  const handleClose = () => {
    closeDrawer('aiWidget')
  }

  return (
    <Sheet open={drawerState.aiWidget} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="px-4 pt-6 sm:px-6">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {text.aiWidget.title}
          </SheetTitle>
          <SheetDescription>{text.aiWidget.description}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex min-h-0 flex-1 flex-col px-4 pb-4 sm:px-6">
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={generateAIReport}
              disabled={aiAnalysis.isLoading}
              className="flex-1"
            >
              {aiAnalysis.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {text.aiWidget.generating}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {text.aiWidget.generate}
                </>
              )}
            </Button>
            {aiAnalysis.lastReport && (
              <Button variant="outline" size="icon" onClick={clearAIReport}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Separator className="my-4" />

          {/* Report Content */}
          <ScrollArea className="flex-1 min-h-0 pr-1">
            {aiAnalysis.isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
                  <Bot className="absolute inset-0 m-auto h-8 w-8 text-primary" />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{text.aiWidget.analyzing}</p>
              </div>
            ) : aiAnalysis.lastReport ? (
              <div className="space-y-5 pb-6">
                {/* Report Metadata */}
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    {text.aiWidget.generatedAt}:{' '}
                    {aiAnalysis.reportGeneratedAt &&
                      format(aiAnalysis.reportGeneratedAt, 'PPP p', { locale: dateLocale })}
                  </p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border bg-card px-3 py-4">
                    <p className="text-xs text-muted-foreground">{labels.totalSales}</p>
                    <p className="mt-1 text-lg font-semibold">{formatCurrency(insights?.totalSales)}</p>
                  </div>
                  <div className="rounded-xl border bg-card px-3 py-4">
                    <p className="text-xs text-muted-foreground">{labels.netSales}</p>
                    <p className="mt-1 text-lg font-semibold">{formatCurrency(insights?.netSales)}</p>
                  </div>
                  <div className="rounded-xl border bg-card px-3 py-4">
                    <p className="text-xs text-muted-foreground">{labels.wowGrowth}</p>
                    <p className="mt-1 flex items-center gap-1 text-lg font-semibold">
                      {typeof insights?.totalSalesGrowthRate === 'number' && insights.totalSalesGrowthRate >= 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-rose-500" />
                      )}
                      {formatPercent(insights?.totalSalesGrowthRate)}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-card px-3 py-4">
                    <p className="text-xs text-muted-foreground">{labels.topWeekday}</p>
                    <p className="mt-1 text-lg font-semibold">
                      {insights?.topWeekday?.weekday ?? (language === 'ko' ? '데이터 없음' : 'No data')}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-xl border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold">{labels.salesSummary}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-md bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">{labels.totalSales}</p>
                        <p className="mt-1 font-semibold">{formatCurrency(insights?.totalSales)}</p>
                      </div>
                      <div className="rounded-md bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">{labels.netSales}</p>
                        <p className="mt-1 font-semibold">{formatCurrency(insights?.netSales)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold">{labels.weekdayAnalysis}</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-muted-foreground">{labels.topWeekday}: </span>
                        <span className="font-medium">
                          {insights?.topWeekday
                            ? `${insights.topWeekday.weekday} (${insights.topWeekday.ratio.toFixed(1)}%)`
                            : (language === 'ko' ? '데이터 없음' : 'No data')}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">{language === 'ko' ? '최저 매출 요일' : 'Lowest Sales Day'}: </span>
                        <span className="font-medium">
                          {insights?.lowWeekday
                            ? `${insights.lowWeekday.weekday} (${insights.lowWeekday.ratio.toFixed(1)}%)`
                            : (language === 'ko' ? '데이터 없음' : 'No data')}
                        </span>
                      </p>
                      <p className="text-muted-foreground">{labels.weekdayShare}</p>
                      <div className="flex flex-wrap gap-2">
                        {(insights?.weekdayDistribution ?? []).map((item) => (
                          <span key={item.weekday} className="rounded-full bg-muted px-2 py-1 text-xs">
                            {item.weekday} {item.ratio.toFixed(1)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold">{labels.deliveryAnalysis}</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-md bg-muted/40 p-3">Uber Eats {insights?.delivery.uberShare?.toFixed(1) ?? '0.0'}%</div>
                      <div className="rounded-md bg-muted/40 p-3">DoorDash {insights?.delivery.doorDashShare?.toFixed(1) ?? '0.0'}%</div>
                      <div className="rounded-md bg-muted/40 p-3">{labels.deliveryShare}: {insights?.delivery.deliveryShare?.toFixed(1) ?? '0.0'}%</div>
                      <div className="rounded-md bg-muted/40 p-3">{labels.feeImpact}: {formatCurrency(insights?.delivery.platformFeeImpact)}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold">{labels.cashManagement}</h4>
                    </div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">{labels.cashGap}: </span>
                      <span className="font-medium">
                        {formatCurrency((insights?.actualCash ?? 0) - (insights?.expectedCash ?? 0))}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold">{labels.aiInsight}</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      {aiInsightLines.map((line, idx) => (
                        <p key={idx} className="leading-6 text-foreground/90">{line}</p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">{text.aiWidget.quickQuestions}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={generateAIReport}>
                      {text.aiWidget.question1}
                    </Button>
                    <Button variant="outline" size="sm" onClick={generateAIReport}>
                      {text.aiWidget.question2}
                    </Button>
                    <Button variant="outline" size="sm" onClick={generateAIReport}>
                      {text.aiWidget.question3}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Bot className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">{text.aiWidget.emptyTitle}</h3>
                <p className="text-sm text-muted-foreground max-w-[250px]">{text.aiWidget.emptyDescription}</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
