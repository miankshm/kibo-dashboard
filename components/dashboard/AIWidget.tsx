'use client'

import { Bot, Loader2, RefreshCw, Sparkles, X } from 'lucide-react'
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
import { ko } from 'date-fns/locale'

export function AIWidget() {
  const { drawerState, closeDrawer, aiAnalysis, generateAIReport, clearAIReport } = useWorkflow()

  const handleClose = () => {
    closeDrawer('aiWidget')
  }

  return (
    <Sheet open={drawerState.aiWidget} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI 매출 분석 비서
          </SheetTitle>
          <SheetDescription>
            AI가 매출 데이터를 분석하여 인사이트를 제공합니다.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col mt-4">
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
                  분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  이번 주 분석 리포트 생성
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
          <ScrollArea className="flex-1">
            {aiAnalysis.isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
                  <Bot className="absolute inset-0 m-auto h-8 w-8 text-primary" />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  데이터를 분석하고 있습니다...
                </p>
              </div>
            ) : aiAnalysis.lastReport ? (
              <div className="space-y-4">
                {/* Report Metadata */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    생성 시간:{' '}
                    {aiAnalysis.reportGeneratedAt &&
                      format(aiAnalysis.reportGeneratedAt, 'PPP p', { locale: ko })}
                  </p>
                </div>

                {/* Report Content */}
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {aiAnalysis.lastReport.split('\n').map((line, index) => (
                      <p key={index} className="mb-2 last:mb-0">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">빠른 질문</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={generateAIReport}>
                      매출이 가장 높은 요일은?
                    </Button>
                    <Button variant="outline" size="sm" onClick={generateAIReport}>
                      배달앱 트렌드 분석
                    </Button>
                    <Button variant="outline" size="sm" onClick={generateAIReport}>
                      현금 차액 원인 분석
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Bot className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">리포트가 없습니다</h3>
                <p className="text-sm text-muted-foreground max-w-[250px]">
                  &apos;이번 주 분석 리포트 생성&apos; 버튼을 클릭하여 AI 분석을 시작하세요.
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
