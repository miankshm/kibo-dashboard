'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivateAccountForm } from '@/components/auth/ActivateAccountForm'

type ActivateAccountPanelProps = {
  token: string
}

const headerCopy = {
  ko: {
    title: '계정 활성화',
    description: '이름과 비밀번호를 설정하면 관리자 계정이 활성화됩니다.',
  },
  en: {
    title: 'Activate your account',
    description: 'Set your name and password to activate your administrator account.',
  },
} as const

export function ActivateAccountPanel({ token }: ActivateAccountPanelProps) {
  const [language, setLanguage] = useState<'ko' | 'en'>('en')
  const copy = headerCopy[language]

  return (
    <Card className="relative z-10 w-full max-w-md shadow-xl">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>

      <CardContent>
        <ActivateAccountForm
          token={token}
          language={language}
          onToggleLanguage={() => setLanguage((previous) => (previous === 'ko' ? 'en' : 'ko'))}
        />
      </CardContent>
    </Card>
  )
}