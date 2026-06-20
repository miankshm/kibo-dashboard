'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { enUS, ko } from 'date-fns/locale'
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
import { useEffect, useState } from 'react'
import { useStore, STORES, type StoreId, type Language } from '@/store/useStore'
import { getTranslation } from '@/lib/i18n'
import { getSalesList } from '@/lib/api/sales'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const createFormSchema = (language: Language) => {
  const text = getTranslation(language)

  return z.object({
    storeId: z.enum(['st-clair', 'woodbridge']).optional(),
    date: z.date({
      required_error: text.dailySalesForm.selectDateError,
    }),
    cardSales: z.number().min(0, text.dailySalesForm.nonNegativeError),
    cashSales: z.number().min(0, text.dailySalesForm.nonNegativeError),
    uberEatsSales: z.number().min(0, text.dailySalesForm.nonNegativeError),
    doorDashSales: z.number().min(0, text.dailySalesForm.nonNegativeError),
    cashAndCarrySales: z.number().min(0, text.dailySalesForm.nonNegativeError),
    tips: z.number().min(0, text.dailySalesForm.nonNegativeError),
    actualClosingCash: z.number().min(0, text.dailySalesForm.nonNegativeError),
  })
}

type FormValues = z.infer<ReturnType<typeof createFormSchema>>

const getDefaultFormValues = (): FormValues => ({
  date: new Date(),
  cardSales: 0,
  cashSales: 0,
  uberEatsSales: 0,
  doorDashSales: 0,
  cashAndCarrySales: 0,
  tips: 0,
  actualClosingCash: 0,
})

export function DailySalesForm() {
  const { drawerState, closeDrawer, resetDailySalesFormData, recordDailySalesEntry } = useWorkflow()
  const { selectedStoreId, language } = useStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const text = getTranslation(language)
  const dateLocale = language === 'ko' ? ko : enUS
  const selectedStore = STORES.find((store) => store.id === selectedStoreId)
  const formSchema = createFormSchema(language)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultFormValues(),
  })
  const watchedDate = form.watch('date')
  const watchedStoreId = form.watch('storeId')
  const resolvedStoreIdForLookup: StoreId | undefined =
    selectedStoreId === 'all' ? watchedStoreId : selectedStoreId

  useEffect(() => {
    if (!drawerState.dailySalesForm) return

    const lastSelectedStore = form.getValues('storeId')
    form.reset({
      ...getDefaultFormValues(),
      storeId: selectedStoreId === 'all' ? lastSelectedStore : undefined,
    })
  }, [drawerState.dailySalesForm, selectedStoreId, form])

  useEffect(() => {
    if (!drawerState.dailySalesForm) return
    if (!watchedDate) return
    if (!resolvedStoreIdForLookup) return

    let cancelled = false

    const loadExistingEntry = async () => {
      const salesDate = format(watchedDate, 'yyyy-MM-dd')

      try {
        const response = await getSalesList({
          storeKey: resolvedStoreIdForLookup,
          startDate: salesDate,
          endDate: salesDate,
          limit: 1,
          sortOrder: 'desc',
        })

        if (cancelled) return

        const existingEntry = response.items[0]
        if (!existingEntry) {
          form.setValue('cardSales', 0)
          form.setValue('cashSales', 0)
          form.setValue('uberEatsSales', 0)
          form.setValue('doorDashSales', 0)
          form.setValue('cashAndCarrySales', 0)
          form.setValue('tips', 0)
          form.setValue('actualClosingCash', 0)
          return
        }

        form.setValue('cardSales', existingEntry.cardSales)
        form.setValue('cashSales', existingEntry.cashSales)
        form.setValue('uberEatsSales', existingEntry.uberEatsSales)
        form.setValue('doorDashSales', existingEntry.doorDashSales)
        form.setValue('cashAndCarrySales', existingEntry.cashAndCarrySales)
        form.setValue('tips', existingEntry.tips)
        form.setValue('actualClosingCash', existingEntry.actualClosingCash)
      } catch {
        if (cancelled) return
      }
    }

    void loadExistingEntry()

    return () => {
      cancelled = true
    }
  }, [drawerState.dailySalesForm, watchedDate, resolvedStoreIdForLookup, form])

  const onSubmit = async (data: FormValues) => {
    const resolvedStoreId: StoreId | null =
      selectedStoreId === 'all' ? (data.storeId ?? null) : selectedStoreId

    if (!resolvedStoreId) {
      form.setError('storeId', { message: text.dailySalesForm.selectStoreError })
      return
    }

    setIsSubmitting(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await recordDailySalesEntry({ ...data, storeId: resolvedStoreId })
    setIsSubmitting(false)
    resetDailySalesFormData()
    closeDrawer('dailySalesForm')
  }

  const handleClose = () => {
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
          <SheetTitle>{text.dailySalesForm.title}</SheetTitle>
          <SheetDescription>{text.dailySalesForm.description}</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            {selectedStoreId === 'all' ? (
              <FormField
                control={form.control}
                name="storeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{text.dailySalesForm.storeLabel}</FormLabel>
                    <Select value={field.value} onValueChange={(value) => field.onChange(value as StoreId)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={text.dailySalesForm.storePlaceholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STORES.filter((store) => store.id !== 'all').map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name[language]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormItem>
                <FormLabel>{text.dailySalesForm.storeLabel}</FormLabel>
                <FormControl>
                  <Input value={selectedStore?.name[language] ?? ''} readOnly />
                </FormControl>
                <FormDescription>{text.dailySalesForm.storeLockedDescription}</FormDescription>
              </FormItem>
            )}

            {/* 기준일 */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{text.dailySalesForm.dateLabel}</FormLabel>
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
                            format(field.value, 'PPP', { locale: dateLocale })
                          ) : (
                            <span>{text.dailySalesForm.datePlaceholder}</span>
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
              <h4 className="text-sm font-medium">{text.dailySalesForm.paymentTitle}</h4>

              <FormField
                control={form.control}
                name="cardSales"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card</FormLabel>
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
                    <FormLabel>Cash</FormLabel>
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
              <h4 className="text-sm font-medium">{text.dailySalesForm.deliveryTitle}</h4>

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
                    <FormLabel>DoorDash</FormLabel>
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
              <h4 className="text-sm font-medium">{text.dailySalesForm.otherTitle}</h4>

              <FormField
                control={form.control}
                name="tips"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{text.dailySalesForm.tips}</FormLabel>
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
                    <FormLabel>{text.dailySalesForm.actualCash}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>{text.dailySalesForm.actualCashDescription}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 총 매출 요약 */}
            <div className="rounded-lg bg-muted p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{text.dailySalesForm.totalSales}</span>
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
                  {text.dailySalesForm.saving}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {text.dailySalesForm.save}
                </>
              )}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
