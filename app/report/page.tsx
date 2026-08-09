'use client'

import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { PageContainer } from '@/components/layout/PageContainer'

export default function ReportPage() {
  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />

      <div className="flex flex-col lg:pl-64">
        <Header />

        <PageContainer>
        </PageContainer>
      </div>
    </div>
  )
}
