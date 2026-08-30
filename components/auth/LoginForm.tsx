'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const REMEMBERED_USERNAME_KEY = 'kibo_remembered_username'

type LoginFormText = {
  isEnglish: boolean
  usernameLabel: string
  usernamePlaceholder: string
  passwordLabel: string
  passwordPlaceholder: string
  rememberLabel: string
  forgotPasswordLabel: string
  loginButton: string
  loggingInButton: string
  loginFailed: string
  networkError: string
}

function localizeLoginError(message: string | undefined, text: LoginFormText): string {
  if (!message || !text.isEnglish) {
    return message ?? text.loginFailed
  }

  const translations: Record<string, string> = {
    '아이디 또는 비밀번호 형식이 올바르지 않습니다.': 'Please enter a valid email and password.',
    '아이디 또는 비밀번호가 일치하지 않습니다.': 'The email or password is incorrect.',
    '로그인에 실패했습니다.': text.loginFailed,
  }

  return translations[message] ?? message
}

type LoginFormProps = {
  nextPath: string
  text: LoginFormText
}

export function LoginForm({ nextPath, text }: LoginFormProps) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const savedUsername = localStorage.getItem(REMEMBERED_USERNAME_KEY)

    if (savedUsername) {
      setUsername(savedUsername)
      setRememberMe(true)
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, rememberMe }),
      })

      const payload = (await response.json()) as { success: boolean; message?: string }

      if (!response.ok || !payload.success) {
        setErrorMessage(localizeLoginError(payload.message, text))
        setIsSubmitting(false)
        return
      }

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, username.trim())
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY)
      }

      router.replace(nextPath)
      router.refresh()
    } catch {
      setErrorMessage(text.networkError)
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="username">{text.usernameLabel}</Label>
        <Input
          id="username"
          name="username"
          type="email"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder={text.usernamePlaceholder}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{text.passwordLabel}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={text.passwordPlaceholder}
          required
        />
      </div>

      <label htmlFor="remember-me" className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          id="remember-me"
          name="remember-me"
          type="checkbox"
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        {text.rememberLabel}
      </label>

      {errorMessage ? (
        <p className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {text.loggingInButton}
          </>
        ) : (
          text.loginButton
        )}
      </Button>

      <div className="text-left">
        <Link href="/reset-password" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {text.forgotPasswordLabel}
        </Link>
      </div>
    </form>
  )
}
