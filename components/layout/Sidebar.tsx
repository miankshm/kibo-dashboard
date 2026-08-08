'use client'

import { LayoutDashboard, TrendingUp, Wallet, Calendar, FileInput, Search, Database, Settings, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useStore } from '@/store/useStore'
import { useWorkflow } from '@/contexts/workflow-context'
import { cn } from '@/lib/utils'
import { getTranslation } from '@/lib/i18n'

const DASHBOARD_PATH = '/'

interface NavItem {
  icon: React.ElementType
  label: string
  href?: string
  sectionId?: string
  drawer?: 'dailySalesForm' | 'aiWidget'
}

export function Sidebar() {
  const { isSidebarOpen, setSidebarOpen, language } = useStore()
  const { openDrawer } = useWorkflow()
  const router = useRouter()
  const pathname = usePathname()
  const text = getTranslation(language)

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: text.sidebar.dashboard, sectionId: 'dashboard' },
    { icon: TrendingUp, label: text.sidebar.salesSummary, sectionId: 'sales' },
    { icon: Wallet, label: text.sidebar.cashFlow, sectionId: 'cashflow' },
    { icon: Calendar, label: text.sidebar.holidayComparison, sectionId: 'holiday' },
    { icon: FileInput, label: text.sidebar.dailySalesInput, drawer: 'dailySalesForm' },
    { icon: Search, label: text.sidebar.salesSearch, href: '/sales-search' },
    { icon: Database, label: text.sidebar.dataLoad, href: '/data-load' },
    { icon: Settings, label: text.sidebar.settings, href: '/settings' },
  ]

  const navigateToDashboardSection = (sectionId: string) => {
    const hash = `#${sectionId}`

    if (pathname === DASHBOARD_PATH) {
      const section = document.getElementById(sectionId)
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      window.history.replaceState(null, '', hash)
      setSidebarOpen(false)
      return
    }

    router.push(`/${hash}`)
    setSidebarOpen(false)
  }

  const handleNavClick = (item: NavItem) => {
    if (item.drawer === 'dailySalesForm') {
      if (pathname === DASHBOARD_PATH) {
        openDrawer('dailySalesForm')
        setSidebarOpen(false)
        return
      }

      router.push('/?openDrawer=dailySalesForm#dashboard')
      setSidebarOpen(false)
      return
    }

    if (item.sectionId) {
      navigateToDashboardSection(item.sectionId)
      return
    }

    if (item.href) {
      router.push(item.href)
      setSidebarOpen(false)
    }
  }

  const NavContent = () => (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item) => (
        <a
          key={item.label}
          href={item.sectionId ? `#${item.sectionId}` : item.href ?? '#'}
          onClick={(e) => {
            e.preventDefault()
            handleNavClick(item)
          }}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
            'text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </a>
      ))}
    </nav>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col">
        <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar">
          {/* Logo area */}
          <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold">K</span>
            </div>
            <span className="font-semibold text-sidebar-foreground">Kibo Dashboard</span>
          </div>
          <NavContent />
        </div>
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={isSidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar">
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-sm font-bold">K</span>
              </div>
              <span className="font-semibold text-sidebar-foreground">Kibo Dashboard</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <NavContent />
        </SheetContent>
      </Sheet>
    </>
  )
}
