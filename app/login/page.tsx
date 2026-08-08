import { LoginForm } from '@/components/auth/LoginForm'
import { Lock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolved = searchParams ? await searchParams : undefined
  const nextValue = resolved?.next
  const nextPath =
    typeof nextValue === 'string' && nextValue.startsWith('/')
      ? nextValue
      : '/'

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.16),transparent_56%),radial-gradient(circle_at_bottom_right,_hsl(var(--accent)/0.14),transparent_44%)]"
      />

      <Card className="relative z-10 w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl">Kibo Dashboard 로그인</CardTitle>
            <CardDescription>내부 대시보드는 로그인한 사용자만 접근할 수 있습니다.</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <LoginForm nextPath={nextPath} />
        </CardContent>
      </Card>
    </main>
  )
}
