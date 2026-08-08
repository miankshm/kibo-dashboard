'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const REMEMBERED_USERNAME_KEY = 'kibo_remembered_username'

type LoginFormText = {
  usernameLabel: string
  usernamePlaceholder: string
  passwordLabel: string
  passwordPlaceholder: string
  rememberLabel: string
  loginButton: string
  loggingInButton: string
  loginFailed: string
  networkError: string
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, rememberMe }),
      })

      const payload = (await response.json()) as { success: boolean; message?: string }

      if (!response.ok || !payload.success) {
        setErrorMessage(payload.message ?? text.loginFailed)
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
        <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
    </form>
  )
}
