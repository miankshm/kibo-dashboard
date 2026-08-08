'use client'

import { useEffect, useMemo, useState } from 'react'
import { BellRing, CheckCircle2, Clock3, Mail, Sparkles } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useStore } from '@/store/useStore'
import { getTranslation } from '@/lib/i18n'

type RequestStatus = 'pending' | 'approved'

type JoinRequest = {
  id: string
  email: string
  requestedAt: string | null
  status: RequestStatus | 'activated'
}

export default function SettingsPage() {
  const language = useStore((state) => state.language)
  const text = getTranslation(language)
  const [notifyUpdates, setNotifyUpdates] = useState(true)
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        const payload = await response.json() as { success?: boolean, notifyUpdates?: boolean, requests?: JoinRequest[] }

        if (payload.success) {
          setNotifyUpdates(payload.notifyUpdates ?? true)
          setRequests(payload.requests ?? [])
        }
      } catch {
        // noop
      }
    }

    void loadSettings()
  }, [])

  const pendingCount = useMemo(() => requests.filter((request) => request.status === 'pending').length, [requests])

  const handleToggleNotify = async (nextValue: boolean) => {
    setNotifyUpdates(nextValue)
    setIsSaving(true)

    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyUpdates: nextValue }),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleApprove = async (id: string) => {
    setApprovingId(id)
    setActionMessage('')
    setActionError('')

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, action: 'approve' }),
      })

      const payload = await response.json() as {
        success?: boolean
        status?: 'pending' | 'approved' | 'activated'
        emailSent?: boolean
        message?: string
      }

      if (!response.ok || !payload.success) {
        setActionError(payload.message ?? '승인 처리에 실패했습니다.')
        return
      }

      setRequests((current) => current.map((request) => (
        request.id === id
          ? { ...request, status: payload.status ?? 'approved' }
          : request
      )))

      if (payload.emailSent === false) {
        setActionError(payload.message ?? '승인은 완료되었지만 메일 발송에 실패했습니다.')
      } else {
        setActionMessage(payload.message ?? '승인 완료')
      }
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      <Sidebar />

      <div className="flex flex-col lg:pl-64">
        <Header />

        <PageContainer>
          <div className="space-y-8 pb-10">
            <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Sparkles className="h-4 w-4" />
                    <span>관리자 설정</span>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">{text.settings.title}</h1>
                  <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{text.settings.description}</p>
                </div>
                <div className="rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-sm font-medium text-primary">
                  {pendingCount > 0 ? `${pendingCount}건 승인 대기` : '모든 요청 처리 완료'}
                </div>
              </div>
            </section>

            <Card className="overflow-hidden border-primary/10 shadow-sm">
              <CardHeader className="border-b bg-muted/20 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <BellRing className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>{text.settings.updateNotificationsTitle}</CardTitle>
                      <CardDescription className="mt-1">{text.settings.updateNotificationsDescription}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-col gap-4 rounded-2xl border bg-background/70 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{text.settings.updateNotificationsLabel}</p>
                    <p className="text-sm text-muted-foreground">
                      {notifyUpdates ? text.settings.updateNotificationsOn : text.settings.updateNotificationsOff}
                    </p>
                  </div>
                  <Switch checked={notifyUpdates} onCheckedChange={handleToggleNotify} disabled={isSaving} />
                </div>
                <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                  {text.settings.updateNotificationsHint}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/20 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>{text.settings.joinRequestsTitle}</CardTitle>
                      <CardDescription className="mt-1">{text.settings.joinRequestsDescription}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {actionMessage ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {actionMessage}
                  </div>
                ) : null}
                {actionError ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                    {actionError}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background/70 p-4 shadow-sm">
                  <div>
                    <p className="font-semibold">{text.settings.pendingTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {text.settings.pendingCount.replace('{count}', String(pendingCount))}
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    {pendingCount} {text.settings.pendingBadge}
                  </Badge>
                </div>

                <Separator />

                {requests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed bg-muted/20 p-10 text-center text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">{text.settings.emptyTitle}</p>
                    <p className="mt-1">{text.settings.emptyDescription}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((request) => (
                      <div key={request.id} className="flex flex-col gap-3 rounded-2xl border bg-background/70 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold">{request.email}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{text.settings.requestedAt}: {request.requestedAt}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={request.status === 'approved' ? 'default' : 'secondary'} className="gap-1 rounded-full px-3 py-1">
                            {request.status === 'approved' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                            {request.status === 'approved' ? text.settings.approved : request.status === 'activated' ? text.settings.activated : text.settings.pending}
                          </Badge>
                          {request.status === 'pending' ? (
                            <Button size="sm" onClick={() => void handleApprove(request.id)} className="rounded-full" disabled={approvingId === request.id}>
                              {approvingId === request.id ? '승인 처리중...' : text.settings.approve}
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" disabled className="rounded-full">
                              {request.status === 'approved' ? text.settings.approved : text.settings.activated}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      </div>
    </div>
  )
}
