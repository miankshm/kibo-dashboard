'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { Clock3, Loader2, MapPin, MessageCircle, Send, Sparkles, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type ChatMessage = {
  id: number
  role: 'assistant' | 'user'
  content: string
}

const CHAT_ENDPOINT = '/api/chat'
const quickQuestions = ['영업시간이 어떻게 되나요?', '예약이 가능한가요?', '추천 메뉴를 알려주세요']

function getResponseText(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim()
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const text = getResponseText(item)
      if (text) {
        return text
      }
    }
  }

  if (payload && typeof payload === 'object') {
    const response = payload as Record<string, unknown>
    const possibleText = response.ai_reply ?? response.output ?? response.response ?? response.message ?? response.text
    return getResponseText(possibleText)
  }

  return null
}

export default function ChatPage() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      content: '안녕하세요. Kibo Sushi에 대해 무엇이 궁금하신가요?',
    },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSubmitting])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedMessage = message.trim()

    if (!trimmedMessage || isSubmitting) {
      return
    }

    const userMessage: ChatMessage = { id: Date.now(), role: 'user', content: trimmedMessage }

    setErrorMessage('')
    setMessage('')
    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
    ])
    setIsSubmitting(true)

    try {
      const sessionId = sessionIdRef.current ?? `web-${crypto.randomUUID()}`
      sessionIdRef.current = sessionId

      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          chatInput: trimmedMessage,
        }),
      })

      const rawResponse = await response.text()
      let payload: unknown = rawResponse

      try {
        payload = JSON.parse(rawResponse)
      } catch {
        // The webhook may return plain text instead of JSON.
      }

      if (!response.ok) {
        throw new Error('The chat request failed.')
      }

      const responseText = getResponseText(payload)
      if (!responseText) {
        throw new Error('The chat response was empty.')
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        { id: Date.now(), role: 'assistant', content: responseText },
      ])
    } catch {
      setErrorMessage('죄송합니다. 지금은 답변을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const askQuestion = (question: string) => {
    if (isSubmitting) {
      return
    }

    setMessage(question)
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">Kibo Sushi</p>
              <p className="text-xs text-muted-foreground">Fresh sushi, made for you</p>
            </div>
          </div>
          <span className="hidden text-sm text-muted-foreground sm:block">Welcome to Kibo Sushi</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.8fr)] lg:px-10 lg:py-12">
        <section className="flex flex-col justify-center space-y-8 py-4 lg:pr-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Kibo Sushi 안내
            </div>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
              맛있는 순간을 위한
              <span className="block text-primary">Kibo Sushi</span>
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              Kibo Sushi의 메뉴와 매장에 대해 궁금한 점을 편하게 물어보세요. 방문 전 필요한 기본 정보를 빠르게 확인할 수 있습니다.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Clock3 className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">영업시간</CardTitle>
                <CardDescription>매장별 운영시간을 확인해 주세요.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">매장 안내</CardTitle>
                <CardDescription>가까운 Kibo Sushi 매장을 찾아보세요.</CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="flex items-start gap-3 border-t pt-6 text-sm text-muted-foreground">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>현재 챗봇은 기본 안내를 위한 placeholder입니다. 더 자세한 정보는 매장에 문의해 주세요.</p>
          </div>
        </section>

        <Card className="overflow-hidden shadow-md">
          <CardHeader className="border-b bg-secondary/40">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Kibo 안내 챗봇</CardTitle>
                <CardDescription>궁금한 내용을 질문해 주세요.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex h-[min(640px,calc(100vh-190px))] min-h-[520px] flex-col gap-5 p-5">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1" aria-live="polite">
              {messages.map((chatMessage) => (
                <div
                  key={chatMessage.id}
                  className={`flex ${chatMessage.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <p
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      chatMessage.role === 'user'
                        ? 'rounded-br-sm bg-primary text-primary-foreground'
                        : 'rounded-bl-sm bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {chatMessage.content}
                  </p>
                </div>
              ))}
              {isSubmitting ? (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-secondary px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    답변을 준비하고 있어요...
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question) => (
                <Button
                  key={question}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => askQuestion(question)}
                  disabled={isSubmitting}
                >
                  {question}
                </Button>
              ))}
            </div>

            <form className="flex gap-2" onSubmit={handleSubmit}>
              <Input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Kibo Sushi에 대해 물어보세요"
                aria-label="Kibo Sushi 질문"
                disabled={isSubmitting}
              />
              <Button type="submit" size="icon" aria-label="질문 보내기" disabled={!message.trim() || isSubmitting}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
