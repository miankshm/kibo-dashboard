import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PDF_NAME_PATTERN = /^\d{8}-\d{8}\.pdf$/

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: unknown; filename?: unknown; pdfBase64?: unknown } | null
  if (!body || typeof body.email !== 'string' || !EMAIL_PATTERN.test(body.email) || typeof body.filename !== 'string' || !PDF_NAME_PATTERN.test(body.filename) || typeof body.pdfBase64 !== 'string') {
    return NextResponse.json({ success: false, message: 'Invalid email report request.' }, { status: 400 })
  }

  const pdf = Buffer.from(body.pdfBase64, 'base64')
  if (pdf.length === 0 || pdf.length > 10 * 1024 * 1024) {
    return NextResponse.json({ success: false, message: 'The PDF attachment must be smaller than 10 MB.' }, { status: 400 })
  }

  const result = await sendEmail({
    to: body.email,
    subject: `KIBO sales report ${body.filename.replace('.pdf', '')}`,
    html: '<p>Your KIBO sales report is attached.</p>',
    text: 'Your KIBO sales report is attached.',
    attachments: [{ filename: body.filename, content: pdf, contentType: 'application/pdf' }],
  })
  return NextResponse.json({ success: result.ok, message: result.message }, { status: result.ok ? 200 : 500 })
}