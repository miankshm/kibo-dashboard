'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ActivateAccountFormProps = {
  token: string
  language?: ActivateLanguage
  onToggleLanguage?: () => void
}
type ActivateLanguage = 'ko' | 'en'

export function ActivateAccountForm({ token, language = 'en', onToggleLanguage }: ActivateAccountFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const resolvedLanguage: ActivateLanguage = language === 'ko' ? 'ko' : 'en'
  const copy = activateCopy[resolvedLanguage]
  const handleToggleLanguage = onToggleLanguage ?? (() => {})

  const tokenMissing = useMemo(() => !token, [token])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting || tokenMissing) {
      return
    }

    if (password.length < 8) {
      setErrorMessage(copy.passwordTooShort)
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage(copy.passwordMismatch)
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/join-requests/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      })

      const payload = (await response.json()) as { success?: boolean; message?: string }

      if (!response.ok || !payload.success) {
        setErrorMessage(payload.message ?? copy.activationFailed)
        return
      }

      setIsDone(true)
      setTimeout(() => {
        router.replace('/login')
      }, 1200)
    } catch {
      setErrorMessage(copy.networkError)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (tokenMissing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={handleToggleLanguage}>
            {copy.languageButton}
          </Button>
        </div>
        <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {copy.invalidLink}
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">{copy.goToLogin}</Link>
        </Button>
      </div>
    )
  }

  if (isDone) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={handleToggleLanguage}>
            {copy.languageButton}
          </Button>
        </div>
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {copy.completed}
        </p>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={handleToggleLanguage}>
          {copy.languageButton}
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="activate-name">{copy.nameLabel}</Label>
        <Input
          id="activate-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={copy.namePlaceholder}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activate-password">{copy.passwordLabel}</Label>
        <Input
          id="activate-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={copy.passwordPlaceholder}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activate-password-confirm">{copy.confirmPasswordLabel}</Label>
        <Input
          id="activate-password-confirm"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder={copy.confirmPasswordPlaceholder}
          required
        />
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {copy.submitting}
          </>
        ) : (
          copy.submit
        )}
      </Button>
    </form>
  )
}

const activateCopy = {
  ko: {
    languageButton: 'English',
    invalidLink: '유효한 활성화 링크가 아닙니다. 관리자에게 다시 승인 요청을 받아주세요.',
    goToLogin: '로그인 페이지로 이동',
    nameLabel: '이름',
    namePlaceholder: '예: Kibo Admin',
    passwordLabel: '비밀번호',
    passwordPlaceholder: '8자 이상 입력하세요',
    confirmPasswordLabel: '비밀번호 확인',
    confirmPasswordPlaceholder: '비밀번호를 다시 입력하세요',
    passwordTooShort: '비밀번호는 8자 이상이어야 합니다.',
    passwordMismatch: '비밀번호 확인이 일치하지 않습니다.',
    activationFailed: '계정 활성화에 실패했습니다.',
    networkError: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    completed: '비밀번호 설정이 완료되었습니다. 로그인 페이지로 이동합니다.',
    submitting: '활성화 중...',
    submit: '비밀번호 설정하고 활성화',
  },
  en: {
    languageButton: '한국어',
    invalidLink: 'This activation link is invalid. Please ask an administrator to approve your request again.',
    goToLogin: 'Go to sign-in',
    nameLabel: 'Name',
    namePlaceholder: 'e.g. Kibo Admin',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter at least 8 characters',
    confirmPasswordLabel: 'Confirm password',
    confirmPasswordPlaceholder: 'Enter your password again',
    passwordTooShort: 'Your password must be at least 8 characters.',
    passwordMismatch: 'The passwords do not match.',
    activationFailed: 'Account activation failed.',
    networkError: 'A network error occurred. Please try again shortly.',
    completed: 'Your password has been set. Redirecting to sign-in.',
    submitting: 'Activating...',
    submit: 'Set password and activate',
  },
} as const
