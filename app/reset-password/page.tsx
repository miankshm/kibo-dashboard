'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getPasswordPolicyError } from '@/lib/password-policy'

type ResetPasswordLanguage = 'ko' | 'en'

const resetPasswordCopy = {
  ko: {
    languageButton: 'English',
    title: '비밀번호 재설정',
    description: '가입한 이메일 주소로 비밀번호 재설정 링크를 보내드립니다.',
    emailLabel: '이메일',
    emailPlaceholder: '이메일을 입력하세요',
    submitButton: '재설정 링크 보내기',
    sendingButton: '전송 중...',
    successMessage: '가입한 이메일 주소로 비밀번호 재설정 링크를 보냈습니다.',
    newPasswordLabel: '새 비밀번호',
    newPasswordPlaceholder: '8자 이상 입력하세요',
    confirmPasswordLabel: '새 비밀번호 확인',
    confirmPasswordPlaceholder: '비밀번호를 다시 입력하세요',
    passwordPolicy: '비밀번호는 12자 이상이며 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.',
    resetButton: '비밀번호 변경하기',
    resettingButton: '변경 중...',
    resetSuccess: '비밀번호가 변경되었습니다. 로그인 페이지로 이동합니다.',
    invalidLink: '재설정 링크가 만료되었거나 올바르지 않습니다.',
    passwordMismatch: '비밀번호 확인이 일치하지 않습니다.',
    networkError: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    backToLogin: '로그인으로 돌아가기',
  },
  en: {
    languageButton: '한국어',
    title: 'Reset Password',
    description: 'We will send a password reset link to the email address you used to register.',
    emailLabel: 'Email',
    emailPlaceholder: 'Enter your email',
    submitButton: 'Send reset link',
    sendingButton: 'Sending...',
    successMessage: 'A password reset link has been sent to the email address you used to register.',
    newPasswordLabel: 'New password',
    newPasswordPlaceholder: 'Enter at least 8 characters',
    confirmPasswordLabel: 'Confirm new password',
    confirmPasswordPlaceholder: 'Enter your password again',
    passwordPolicy: 'Your password must be at least 12 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.',
    resetButton: 'Change password',
    resettingButton: 'Changing...',
    resetSuccess: 'Your password has been changed. Redirecting to sign in.',
    invalidLink: 'This reset link is expired or invalid.',
    passwordMismatch: 'The passwords do not match.',
    networkError: 'A network error occurred. Please try again shortly.',
    backToLogin: 'Back to sign in',
  },
} as const

function localizeResetError(message: string | undefined, language: ResetPasswordLanguage, fallback: string): string {
  if (!message || language === 'ko') {
    return message ?? fallback
  }

  const translations: Record<string, string> = {
    '이메일을 입력해주세요.': 'Please enter your email address.',
    '서비스를 준비하는 중입니다.': 'The service is not ready yet. Please try again shortly.',
    '재설정 이메일을 보내지 못했습니다.': 'We could not send the password reset email.',
    '재설정 링크가 올바르지 않습니다.': 'The password reset link is invalid.',
    '비밀번호는 8자 이상이어야 합니다.': 'The password must be at least 8 characters long.',
    '재설정 링크가 만료되었거나 이미 사용되었습니다.': 'This password reset link has expired or has already been used.',
  }

  return translations[message] ?? message
}

export default function ResetPasswordPage() {
  const [language, setLanguage] = useState<ResetPasswordLanguage>('ko')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const copy = resetPasswordCopy[language]
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    if (token && getPasswordPolicyError(password)) {
      setErrorMessage(copy.passwordPolicy)
      return
    }

    if (token && password !== confirmPassword) {
      setErrorMessage(copy.passwordMismatch)
      return
    }

    setErrorMessage('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const endpoint = token ? '/api/auth/reset-password' : '/api/auth/request-password-reset'
      const body = token ? { token, password } : { email }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = (await response.json()) as { success?: boolean; code?: string; message?: string }

      if (!response.ok || !payload.success) {
        setErrorMessage(payload.code === 'passwordPolicy'
          ? copy.passwordPolicy
          : localizeResetError(payload.message, language, copy.networkError))
        return
      }

      if (token) {
        setMessage(copy.resetSuccess)
        setTimeout(() => router.replace('/login'), 1200)
      } else {
        setMessage(copy.successMessage)
      }
    } catch {
      setErrorMessage(copy.networkError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-8 sm:top-8">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLanguage((prev) => (prev === 'ko' ? 'en' : 'ko'))}
        >
          {copy.languageButton}
        </Button>
      </div>

      <Card className="w-full max-w-md border-transparent shadow-none">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{token ? copy.resetButton : copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            {token ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-password">{copy.newPasswordLabel}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    placeholder={copy.newPasswordPlaceholder}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{copy.confirmPasswordLabel}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    placeholder={copy.confirmPasswordPlaceholder}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="reset-email">{copy.emailLabel}</Label>
                <Input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={copy.emailPlaceholder}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            )}

            {errorMessage ? (
              <p className="text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}
            {message ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {message}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />{token ? copy.resettingButton : copy.sendingButton}</> : token ? copy.resetButton : copy.submitButton}
            </Button>

            <Button asChild type="button" variant="ghost" className="w-full gap-2 text-muted-foreground">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" />
                {copy.backToLogin}
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
