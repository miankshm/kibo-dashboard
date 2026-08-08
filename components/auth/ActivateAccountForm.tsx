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
}

export function ActivateAccountForm({ token }: ActivateAccountFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const tokenMissing = useMemo(() => !token, [token])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting || tokenMissing) {
      return
    }

    if (password.length < 8) {
      setErrorMessage('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('비밀번호 확인이 일치하지 않습니다.')
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
        setErrorMessage(payload.message ?? '계정 활성화에 실패했습니다.')
        return
      }

      setIsDone(true)
      setTimeout(() => {
        router.replace('/login')
      }, 1200)
    } catch {
      setErrorMessage('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (tokenMissing) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          유효한 활성화 링크가 아닙니다. 관리자에게 다시 승인 요청을 받아주세요.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">로그인 페이지로 이동</Link>
        </Button>
      </div>
    )
  }

  if (isDone) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          비밀번호 설정이 완료되었습니다. 로그인 페이지로 이동합니다.
        </p>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="activate-name">이름</Label>
        <Input
          id="activate-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="예: Kibo Admin"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activate-password">비밀번호</Label>
        <Input
          id="activate-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="8자 이상 입력하세요"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activate-password-confirm">비밀번호 확인</Label>
        <Input
          id="activate-password-confirm"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="비밀번호를 다시 입력하세요"
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
            활성화 중...
          </>
        ) : (
          '비밀번호 설정하고 활성화'
        )}
      </Button>
    </form>
  )
}
