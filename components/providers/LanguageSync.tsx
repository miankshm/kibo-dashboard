'use client'

import { useEffect } from 'react'
import { useStore } from '@/store/useStore'

export function LanguageSync() {
  const language = useStore((state) => state.language)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return null
}