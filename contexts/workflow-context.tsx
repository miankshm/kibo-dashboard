'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { StoreId } from '@/store/useStore'
import { useStore } from '@/store/useStore'
import { analyzeAIReport } from '@/lib/api/ai'
import { getSalesList, upsertDailySales } from '@/lib/api/sales'

// 데이터 입력 폼 상태
export interface DailySalesFormData {
  storeId: StoreId | null
  date: Date | null
  cardSales: number
  cashSales: number
  uberEatsSales: number
  doorDashSales: number
  cashAndCarrySales: number
  tips: number
  actualClosingCash: number
}

export interface DailySalesEntry extends DailySalesFormData {
  id: string
  storeId: StoreId
}

// AI 분석 상태
export interface AIAnalysisState {
  isLoading: boolean
  lastReport: string | null
  reportGeneratedAt: Date | null
}

// Drawer 상태
export interface DrawerState {
  dailySalesForm: boolean
  aiWidget: boolean
}

// 대시보드 데이터 로딩 상태
export interface LoadingState {
  salesSummary: boolean
  cashFlow: boolean
  holidayComparison: boolean
}

interface WorkflowContextType {
  // Drawer 상태 관리
  drawerState: DrawerState
  openDrawer: (drawer: keyof DrawerState) => void
  closeDrawer: (drawer: keyof DrawerState) => void
  closeAllDrawers: () => void

  // 데이터 입력 폼 상태
  dailySalesFormData: DailySalesFormData
  setDailySalesFormData: (data: Partial<DailySalesFormData>) => void
  resetDailySalesFormData: () => void
  dailySalesEntries: DailySalesEntry[]
  recordDailySalesEntry: (data: DailySalesFormData & { storeId: StoreId }) => Promise<void>
  dataVersion: number

  // AI 분석 상태
  aiAnalysis: AIAnalysisState
  generateAIReport: () => Promise<void>
  clearAIReport: () => void

  // 로딩 상태
  loadingState: LoadingState
  setLoadingState: (state: Partial<LoadingState>) => void

  // 매출 표시 모드 (Gross/Net)
  showGrossSales: boolean
  toggleSalesMode: () => void

  // 기간 선택
  selectedPeriod: 'daily' | 'weekly' | 'monthly'
  setSelectedPeriod: (period: 'daily' | 'weekly' | 'monthly') => void
}

const initialDailySalesFormData: DailySalesFormData = {
  storeId: null,
  date: null,
  cardSales: 0,
  cashSales: 0,
  uberEatsSales: 0,
  doorDashSales: 0,
  cashAndCarrySales: 0,
  tips: 0,
  actualClosingCash: 0,
}

const initialAIAnalysis: AIAnalysisState = {
  isLoading: false,
  lastReport: null,
  reportGeneratedAt: null,
}

const initialDrawerState: DrawerState = {
  dailySalesForm: false,
  aiWidget: false,
}

const initialLoadingState: LoadingState = {
  salesSummary: false,
  cashFlow: false,
  holidayComparison: false,
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined)

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const selectedStoreId = useStore((state) => state.selectedStoreId)
  const language = useStore((state) => state.language)
  const [drawerState, setDrawerState] = useState<DrawerState>(initialDrawerState)
  const [dailySalesFormData, setDailySalesFormDataState] = useState<DailySalesFormData>(initialDailySalesFormData)
  const [dailySalesEntries, setDailySalesEntries] = useState<DailySalesEntry[]>([])
  const [aiAnalysis, setAIAnalysis] = useState<AIAnalysisState>(initialAIAnalysis)
  const [loadingState, setLoadingStateInternal] = useState<LoadingState>(initialLoadingState)
  const [showGrossSales, setShowGrossSales] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [dataVersion, setDataVersion] = useState(0)

  const openDrawer = useCallback((drawer: keyof DrawerState) => {
    setDrawerState((prev) => ({ ...prev, [drawer]: true }))
  }, [])

  const closeDrawer = useCallback((drawer: keyof DrawerState) => {
    setDrawerState((prev) => ({ ...prev, [drawer]: false }))
  }, [])

  const closeAllDrawers = useCallback(() => {
    setDrawerState(initialDrawerState)
  }, [])

  const setDailySalesFormData = useCallback((data: Partial<DailySalesFormData>) => {
    setDailySalesFormDataState((prev) => ({ ...prev, ...data }))
  }, [])

  const resetDailySalesFormData = useCallback(() => {
    setDailySalesFormDataState(initialDailySalesFormData)
  }, [])

  const recordDailySalesEntry = useCallback(async (data: DailySalesFormData & { storeId: StoreId }) => {
    if (!data.date || data.storeId === 'all') return

    const savedRecord = await upsertDailySales({
      storeKey: data.storeId,
      salesDate: data.date.toISOString().split('T')[0],
      cardSales: data.cardSales,
      cashSales: data.cashSales,
      uberEatsSales: data.uberEatsSales,
      doorDashSales: data.doorDashSales,
      cashAndCarrySales: data.cashAndCarrySales,
      tips: data.tips,
      actualClosingCash: data.actualClosingCash,
    })

    const nextEntry: DailySalesEntry = {
      id: savedRecord.id,
      storeId: data.storeId,
      date: new Date(`${savedRecord.salesDate}T00:00:00`),
      cardSales: savedRecord.cardSales,
      cashSales: savedRecord.cashSales,
      uberEatsSales: savedRecord.uberEatsSales,
      doorDashSales: savedRecord.doorDashSales,
      cashAndCarrySales: savedRecord.cashAndCarrySales,
      tips: savedRecord.tips,
      actualClosingCash: savedRecord.actualClosingCash,
    }

    setDailySalesEntries((prev) => {
      const filtered = prev.filter((entry) => entry.id !== nextEntry.id)
      return [...filtered, nextEntry].sort(
        (left, right) => left.date!.getTime() - right.date!.getTime()
      )
    })
    setDataVersion((prev) => prev + 1)
  }, [])

  const generateAIReport = useCallback(async () => {
    setAIAnalysis((prev) => ({ ...prev, isLoading: true }))

    try {
      const endDate = new Date()
      const startDate = new Date(endDate)
      startDate.setDate(endDate.getDate() - 6)

      const report = await analyzeAIReport({
        storeKey: selectedStoreId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        analysisType: 'weekly',
      })

      setAIAnalysis({
        isLoading: false,
        lastReport: report.summary,
        reportGeneratedAt: new Date(report.generatedAt),
      })
    } catch {
      setAIAnalysis({
        isLoading: false,
        lastReport:
          language === 'ko'
            ? 'AI 리포트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
            : 'Unable to load the AI report. Please try again shortly.',
        reportGeneratedAt: new Date(),
      })
    }
  }, [language, selectedStoreId])

  const clearAIReport = useCallback(() => {
    setAIAnalysis(initialAIAnalysis)
  }, [])

  const setLoadingState = useCallback((state: Partial<LoadingState>) => {
    setLoadingStateInternal((prev) => ({ ...prev, ...state }))
  }, [])

  const toggleSalesMode = useCallback(() => {
    setShowGrossSales((prev) => !prev)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadSalesEntries() {
      try {
        const endDate = new Date()
        const startDate = new Date(endDate)
        startDate.setDate(endDate.getDate() - 29)

        const response = await getSalesList({
          storeKey: selectedStoreId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          limit: 30,
          sortOrder: 'asc',
        })

        if (!isMounted) return

        setDailySalesEntries(
          response.items.map((entry) => ({
            id: entry.id,
            storeId: selectedStoreId === 'all' ? 'all' : entry.storeKey,
            date: new Date(`${entry.salesDate}T00:00:00`),
            cardSales: entry.cardSales,
            cashSales: entry.cashSales,
            uberEatsSales: entry.uberEatsSales,
            doorDashSales: entry.doorDashSales,
            cashAndCarrySales: entry.cashAndCarrySales,
            tips: entry.tips,
            actualClosingCash: entry.actualClosingCash,
          }))
        )
      } catch {
        if (!isMounted) return
        setDailySalesEntries([])
      }
    }

    loadSalesEntries()

    return () => {
      isMounted = false
    }
  }, [selectedStoreId, dataVersion])

  return (
    <WorkflowContext.Provider
      value={{
        drawerState,
        openDrawer,
        closeDrawer,
        closeAllDrawers,
        dailySalesFormData,
        setDailySalesFormData,
        resetDailySalesFormData,
        dailySalesEntries,
        recordDailySalesEntry,
        dataVersion,
        aiAnalysis,
        generateAIReport,
        clearAIReport,
        loadingState,
        setLoadingState,
        showGrossSales,
        toggleSalesMode,
        selectedPeriod,
        setSelectedPeriod,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  )
}

export function useWorkflow() {
  const context = useContext(WorkflowContext)
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider')
  }
  return context
}
