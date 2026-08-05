'use client'

import { Menu, Moon, Sun, Bot, Languages, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { useWorkflow } from '@/contexts/workflow-context'
import { StoreSelector } from '@/components/dashboard/StoreSelector'
import { getTranslation } from '@/lib/i18n'

export function Header() {
  const router = useRouter()
  const { toggleSidebar, isDarkMode, toggleDarkMode, language, toggleLanguage } = useStore()
  const { openDrawer } = useWorkflow()
  const text = getTranslation(language)

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
    } finally {
      router.replace('/login')
      router.refresh()
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">{text.header.menu}</span>
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">K</span>
          </div>
          <span className="hidden font-semibold sm:inline-block">Kibo Dashboard</span>
        </div>

        {/* Store Selector */}
        <div className="ml-auto flex items-center gap-2 sm:ml-4">
          <StoreSelector />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* AI Widget Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openDrawer('aiWidget')}
            className="text-primary hover:bg-primary/10"
          >
            <Bot className="h-5 w-5" />
            <span className="sr-only">{text.header.ai}</span>
          </Button>

          <Button
            variant="ghost"
            onClick={toggleLanguage}
            className="gap-2 px-3 text-sm font-medium"
          >
            <Languages className="h-4 w-4" />
            <span>{language === 'ko' ? 'EN' : 'KR'}</span>
            <span className="sr-only">{text.header.language}</span>
          </Button>

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            <span className="sr-only">{text.header.theme}</span>
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={handleLogout}
          className="ml-auto gap-2 px-3 text-sm font-medium"
        >
          <LogOut className="h-4 w-4" />
          <span>{text.header.logout}</span>
        </Button>
      </div>
    </header>
  )
}
