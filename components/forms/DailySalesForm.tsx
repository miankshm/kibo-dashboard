'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarIcon, Loader2, Save } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { useWorkflow } from '@/contexts/workflow-context'
import { cn } from '@/lib/utils'
import { useState } from 'react'

// Zod 스키마 - Light validation
const formSchema = z.object({
  date: z.date({
    required_error: '날짜를 선택해주세요.',
  }),
  cardSales: z.number().min(0, '0 이상의 금액을 입력해주세요.'),
  cashSales: z.number().min(0, '0 이상의 금액을 입력해주세요.'),
  uberEatsSales: z.number().min(0, '0 이상의 금액을 입력해주세요.'),
  doorDashSales: z.number().min(0, '0 이상의 금액을 입력해주세요.'),
  cashAndCarrySales: z.number().min(0, '0 이상의 금액을 입력해주세요.'),
  tips: z.number().min(0, '0 이상의 금액을 입력해주세요.'),
  actualClosingCash: z.number().min(0, '0 이상의 금액을 입력해주세요.'),
})

type FormValues = z.infer<typeof formSchema>

export function DailySalesForm() {
  const { drawerState, closeDrawer, resetDailySalesFormData, recordDailySalesEntry } = useWorkflow()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cardSales: 0,
      cashSales: 0,
      uberEatsSales: 0,
      doorDashSales: 0,
      cashAndCarrySales: 0,
      tips: 0,
      actualClosingCash: 0,
    },
  })

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    console.log('일일 매출 데이터 제출:', data)
    recordDailySalesEntry(data)
    setIsSubmitting(false)
    form.reset()
    resetDailySalesFormData()
    closeDrawer('dailySalesForm')
  }

  const handleClose = () => {
    form.reset()
    closeDrawer('dailySalesForm')
  }

  // 총 매출 계산
  const watchedValues = form.watch()
  const totalSales =
    (watchedValues.cardSales || 0) +
    (watchedValues.cashSales || 0) +
    (watchedValues.uberEatsSales || 0) +
    (watchedValues.doorDashSales || 0) +
    (watchedValues.cashAndCarrySales || 0)

  return (
    <Sheet open={drawerState.dailySalesForm} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>일일 매출 입력</SheetTitle>
          <SheetDescription>
            오늘의 매출 데이터를 입력해주세요. 모든 금액은 달러($) 단위입니다.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            {/* 기준일 */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>기준일</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: ko })
                          ) : (
                            <span>날짜 선택</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date('2020-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* 결제 수단별 매출 */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">결제 수단별 매출</h4>

              <FormField
                control={form.control}
                name="cardSales"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>카드 결제 (Card)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cashSales"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>현금 결제 (Cash)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* 배달앱 매출 */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">배달앱 매출</h4>

              <FormField
                control={form.control}
                name="uberEatsSales"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uber Eats</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="doorDashSales"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Door Dash</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cashAndCarrySales"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cash & Carry</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* 기타 */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">기타</h4>

              <FormField
                control={form.control}
                name="tips"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>팁 (Tips)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actualClosingCash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>실제 마감 현금</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      마감 시 금고에 있는 실제 현금액
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 총 매출 요약 */}
            <div className="rounded-lg bg-muted p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">총 매출</span>
                <span className="text-lg font-bold text-primary">
                  ${totalSales.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 제출 버튼 */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  저장하기
                </>
              )}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
