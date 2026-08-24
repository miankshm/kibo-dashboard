'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'
import { Lock, Mail, MessageCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type LoginLanguage = 'ko' | 'en'

const loginCopy = {
  ko: {
    title: 'Kibo 관리자 전용 로그인',
    description: '내부 대시보드는 로그인한 관리자만 접근할 수 있습니다.',
    langButton: 'English',
    joinTitle: '가입 요청',
    joinDescription: '아직 계정이 없다면 이메일을 보내서 관리자의 승인을 요청할 수 있습니다.',
    joinSuccess: '가입 요청이 접수되었습니다. 관리자 승인 후 안내 메일을 보내드릴게요.',
    joinEmailLabel: '이메일 주소',
    joinEmailPlaceholder: 'name@example.com',
    joinSubmitting: '전송 중...',
    joinSubmit: '가입 요청 보내기',
    heroTitle: 'Kibo Sushi 고객님이신가요?',
    heroDescription: 'Kibo Sushi House에 대해 궁금한 점을 물어보세요',
    heroBullets: ['24시간 실시간 AI 상담', '주문·예약 관련 빠른 답변'],
    chatCta: 'AI 챗봇 상담 시작하기',
    loginForm: {
      isEnglish: false,
      usernameLabel: '이메일',
      usernamePlaceholder: '이메일을 입력하세요',
      passwordLabel: '비밀번호',
      passwordPlaceholder: '비밀번호를 입력하세요',
      rememberLabel: '이메일 기억하기',
      forgotPasswordLabel: '비밀번호를 잊으셨나요?',
      loginButton: '로그인',
      loggingInButton: '로그인 중...',
      loginFailed: '로그인에 실패했습니다.',
      networkError: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    },
  },
  en: {
    title: 'Kibo Admin Sign In',
    description: 'Only authenticated admins can access the internal dashboard.',
    langButton: '한국어',
    joinTitle: 'Request Access',
    joinDescription: 'If you do not have an account yet, request approval from an admin with your email.',
    joinSuccess: 'Your request has been submitted. You will receive an email after admin approval.',
    joinEmailLabel: 'Email address',
    joinEmailPlaceholder: 'name@example.com',
    joinSubmitting: 'Sending...',
    joinSubmit: 'Send access request',
    heroTitle: 'Are you a Kibo Sushi customer?',
    heroDescription: 'Ask anything you would like to know about Kibo Sushi House.',
    heroBullets: ['24/7 real-time AI support', 'Fast answers for orders & bookings'],
    chatCta: 'Start AI chatbot',
    loginForm: {
      isEnglish: true,
      usernameLabel: 'Email',
      usernamePlaceholder: 'Enter your email',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      rememberLabel: 'Remember email',
      forgotPasswordLabel: 'Forgot your password?',
      loginButton: 'Sign in',
      loggingInButton: 'Signing in...',
      loginFailed: 'Failed to sign in.',
      networkError: 'A network error occurred. Please try again shortly.',
    },
  },
} as const

export default function LoginPage({ searchParams }: LoginPageProps) {
  const [language, setLanguage] = useState<LoginLanguage>('ko')
  const [joinEmail, setJoinEmail] = useState('')
  const [joinSubmitted, setJoinSubmitted] = useState(false)
  const [joinSubmitting, setJoinSubmitting] = useState(false)
  const copy = loginCopy[language]

  const handleJoinRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setJoinSubmitting(true)

    try {
      const response = await fetch('/api/join-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: joinEmail }),
      })

      if (response.ok) {
        setJoinSubmitted(true)
        setJoinEmail('')
      }
    } finally {
      setJoinSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background lg:flex-row">
      <div className="absolute right-4 top-4 z-20 sm:right-8 sm:top-8">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLanguage((prev) => (prev === 'ko' ? 'en' : 'ko'))}
        >
          {copy.langButton}
        </Button>
      </div>

      {/* Left: Kibo AI chatbot intro for general customers */}
      <div className="relative flex min-h-[50vh] w-full flex-col items-start justify-start overflow-hidden bg-[#99B759] px-8 pt-20 text-left text-primary-foreground sm:px-12 sm:pt-24 lg:min-h-screen lg:w-1/2 lg:flex-none lg:pt-52">
        <div className="relative z-10 max-w-md space-y-4">
          <h2 className="text-2xl font-bold leading-tight sm:text-3xl">{copy.heroTitle}</h2>
          <p className="text-sm text-primary-foreground/80">{copy.heroDescription}</p>

          <ul className="space-y-2 text-xs text-primary-foreground/90 sm:text-sm">
            {copy.heroBullets.map((bullet) => (
              <li key={bullet} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/70" />
                {bullet}
              </li>
            ))}
          </ul>

          <Button asChild size="lg" variant="secondary" className="gap-2">
            <Link href="/chat">
              <MessageCircle className="h-4 w-4" />
              {copy.chatCta}
            </Link>
          </Button>
        </div>

      </div>

      {/* Right: Admin-only login and join request */}
      <div className="flex min-h-[50vh] w-full items-start justify-center px-4 pt-20 sm:pt-24 lg:min-h-screen lg:w-1/2 lg:flex-none lg:pt-20">
        <Card className="w-full max-w-md border-transparent bg-transparent shadow-none">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl">{copy.title}</CardTitle>
              <CardDescription>{copy.description}</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <LoginForm nextPath="/" text={copy.loginForm} />

            <div className="space-y-3 rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Mail className="h-4 w-4" />
                <span>{copy.joinTitle}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {copy.joinDescription}
              </p>
              {joinSubmitted ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {copy.joinSuccess}
                </div>
              ) : (
                <form onSubmit={handleJoinRequest} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="join-email">{copy.joinEmailLabel}</Label>
                    <Input
                      id="join-email"
                      type="email"
                      placeholder={copy.joinEmailPlaceholder}
                      value={joinEmail}
                      onChange={(event) => setJoinEmail(event.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={joinSubmitting}>
                    <Send className="h-4 w-4" />
                    {joinSubmitting ? copy.joinSubmitting : copy.joinSubmit}
                  </Button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

