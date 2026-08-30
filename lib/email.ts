import nodemailer from 'nodemailer'

type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType: string
  }>
}

type SendEmailResult = {
  ok: boolean
  message?: string
}

function parseSmtpPort(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 465
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST
  const port = parseSmtpPort(process.env.SMTP_PORT)
  const secure = (process.env.SMTP_SECURE ?? 'true').toLowerCase() === 'true'
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.MAIL_FROM_EMAIL

  if (!host || !user || !pass || !from) {
    return {
      ok: false,
      message: 'SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM_EMAIL 설정이 필요합니다.',
    }
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    })

    await transporter.verify()
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments,
    })

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return { ok: false, message: `메일 발송 중 오류: ${message}` }
  }
}
