'use client'

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { StoreId } from '@/store/useStore'
import { useStore } from '@/store/useStore'

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
  recordDailySalesEntry: (data: DailySalesFormData & { storeId: StoreId }) => void

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
  const [drawerState, setDrawerState] = useState<DrawerState>(initialDrawerState)
  const [dailySalesFormData, setDailySalesFormDataState] = useState<DailySalesFormData>(initialDailySalesFormData)
  const [dailySalesEntries, setDailySalesEntries] = useState<DailySalesEntry[]>([])
  const [aiAnalysis, setAIAnalysis] = useState<AIAnalysisState>(initialAIAnalysis)
  const [loadingState, setLoadingStateInternal] = useState<LoadingState>(initialLoadingState)
  const [showGrossSales, setShowGrossSales] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')

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

  const recordDailySalesEntry = useCallback((data: DailySalesFormData & { storeId: StoreId }) => {
    if (!data.date) return

    const entryDate = data.date.toISOString().split('T')[0]
    const entryId = `${data.storeId}-${entryDate}`

    setDailySalesEntries((prev) => {
      const filtered = prev.filter((entry) => entry.id !== entryId)
      return [...filtered, { ...data, id: entryId }].sort(
        (left, right) => left.date!.getTime() - right.date!.getTime()
      )
    })
  }, [])

  const generateAIReport = useCallback(async () => {
    const language = useStore.getState().language
    setAIAnalysis((prev) => ({ ...prev, isLoading: true }))
    
    // Simulate AI API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const mockReport =
      language === 'ko'
        ? `이번 주 매출 분석 리포트입니다.

📊 주요 지표:
• 총 매출: 전주 대비 12.5% 증가
• 카드 결제: 65% (전주 대비 +3%)
• 현금 결제: 20% (전주 대비 -2%)
• 배달앱 매출: 15% (전주 대비 +5%)

💡 인사이트:
• 주말 저녁 시간대 매출이 가장 높았습니다.
• Uber Eats 주문이 Door Dash 대비 30% 더 높은 성장률을 보였습니다.
• 현금 사용 비율이 감소하는 추세입니다.

🎯 추천 액션:
• 배달앱 프로모션 강화를 고려해 보세요.
• 주말 인력 배치 최적화가 필요합니다.`
        : `This week's sales analysis report.

📊 Key metrics:
• Total sales: up 12.5% week over week
• Card payments: 65% share (+3% WoW)
• Cash payments: 20% share (-2% WoW)
• Delivery sales: 15% share (+5% WoW)

💡 Insights:
• Weekend evening hours delivered the highest sales.
• Uber Eats orders grew 30% faster than DoorDash.
• Cash usage continues to trend downward.

🎯 Recommended actions:
• Consider strengthening delivery platform promotions.
• Optimize staffing for weekend coverage.`

    setAIAnalysis({
      isLoading: false,
      lastReport: mockReport,
      reportGeneratedAt: new Date(),
    })
  }, [])

  const clearAIReport = useCallback(() => {
    setAIAnalysis(initialAIAnalysis)
  }, [])

  const setLoadingState = useCallback((state: Partial<LoadingState>) => {
    setLoadingStateInternal((prev) => ({ ...prev, ...state }))
  }, [])

  const toggleSalesMode = useCallback(() => {
    setShowGrossSales((prev) => !prev)
  }, [])

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
