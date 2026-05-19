'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { PageContainer } from '@/components/layout/PageContainer'
import { SalesSummary } from '@/components/dashboard/SalesSummary'
import { CashFlowAnalysis } from '@/components/dashboard/CashFlowAnalysis'
import { HolidayComparison } from '@/components/dashboard/HolidayComparison'
import { DailySalesForm } from '@/components/forms/DailySalesForm'
import { AIWidget } from '@/components/dashboard/AIWidget'
import { useWorkflow } from '@/contexts/workflow-context'
import { useStore } from '@/store/useStore'
import { getTranslation } from '@/lib/i18n'

export default function DashboardPage() {
  const { openDrawer } = useWorkflow()
  const language = useStore((state) => state.language)
  const text = getTranslation(language)

  return (
    <div className="relative min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-col lg:pl-64">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <PageContainer>
          <div className="space-y-10">
            {/* Dashboard Header */}
            <section id="dashboard" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{text.app.dashboardTitle}</h1>
                <p className="text-muted-foreground">{text.app.dashboardDescription}</p>
              </div>
              <Button onClick={() => openDrawer('dailySalesForm')} className="gap-2">
                <Plus className="h-4 w-4" />
                {text.app.dailySalesButton}
              </Button>
            </section>

            {/* Sales Summary Section */}
            <SalesSummary />

            {/* Cash Flow Analysis Section */}
            <CashFlowAnalysis />

            {/* Holiday Comparison Section */}
            <HolidayComparison />
          </div>
        </PageContainer>
      </div>

      {/* Floating AI Button (Mobile) */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg lg:hidden"
        onClick={() => openDrawer('aiWidget')}
      >
        <span className="sr-only">{text.app.floatingAi}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <path d="M12 8V4H8" />
          <rect width="16" height="12" x="4" y="8" rx="2" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />
          <path d="M15 13v2" />
          <path d="M9 13v2" />
        </svg>
      </Button>

      {/* Drawers */}
      <DailySalesForm />
      <AIWidget />
    </div>
  )
}
