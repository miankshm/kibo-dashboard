'use client'

import { LayoutDashboard, TrendingUp, Wallet, Calendar, FileInput, Settings, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useStore } from '@/store/useStore'
import { useWorkflow } from '@/contexts/workflow-context'
import { cn } from '@/lib/utils'

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
  action?: () => void
}

export function Sidebar() {
  const { isSidebarOpen, setSidebarOpen } = useStore()
  const { openDrawer } = useWorkflow()

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: '대시보드', href: '#dashboard' },
    { icon: TrendingUp, label: '매출 요약', href: '#sales' },
    { icon: Wallet, label: '현금 흐름', href: '#cashflow' },
    { icon: Calendar, label: '홀리데이 비교', href: '#holiday' },
    {
      icon: FileInput,
      label: '일일 매출 입력',
      href: '#',
      action: () => {
        openDrawer('dailySalesForm')
        setSidebarOpen(false)
      },
    },
    { icon: Settings, label: '설정', href: '#settings' },
  ]

  const handleNavClick = (item: NavItem) => {
    if (item.action) {
      item.action()
    } else {
      setSidebarOpen(false)
    }
  }

  const NavContent = () => (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item) => (
        <a
          key={item.label}
          href={item.href}
          onClick={(e) => {
            if (item.action) {
              e.preventDefault()
            }
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
