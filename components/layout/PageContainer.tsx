'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main
      className={cn(
        'min-h-[calc(100vh-4rem)] w-full lg:pl-64',
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {children}
      </div>
    </main>
  )
}
