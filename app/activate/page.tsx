import { ActivateAccountForm } from '@/components/auth/ActivateAccountForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type ActivatePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ActivatePage({ searchParams }: ActivatePageProps) {
  const resolved = searchParams ? await searchParams : undefined
  const tokenValue = resolved?.token
  const token = typeof tokenValue === 'string' ? tokenValue : ''

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.14),transparent_56%),radial-gradient(circle_at_bottom_right,_hsl(var(--accent)/0.12),transparent_44%)]"
      />

      <Card className="relative z-10 w-full max-w-md shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">계정 활성화</CardTitle>
          <CardDescription>이름과 비밀번호를 설정하면 관리자 계정이 활성화됩니다.</CardDescription>
        </CardHeader>

        <CardContent>
          <ActivateAccountForm token={token} />
        </CardContent>
      </Card>
    </main>
  )
}
