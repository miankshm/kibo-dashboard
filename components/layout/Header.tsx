'use client'

import { Menu, Moon, Sun, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { useWorkflow } from '@/contexts/workflow-context'
import { StoreSelector } from '@/components/dashboard/StoreSelector'

export function Header() {
  const { toggleSidebar, isDarkMode, toggleDarkMode } = useStore()
  const { openDrawer } = useWorkflow()

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
          <span className="sr-only">Toggle menu</span>
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
            <span className="sr-only">AI 분석</span>
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
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
