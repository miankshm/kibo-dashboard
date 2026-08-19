import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

export const AUTH_COOKIE_NAME = 'kibo_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

// Falls back to a per-process random secret so a missing env var can't produce a guessable session signature.
const SESSION_SECRET = process.env.SESSION_SECRET ?? randomBytes(32).toString('hex')

function sign(payload: string): string {
  return createHmac('sha256', SESSION_SECRET).update(payload).digest('hex')
}

export function createSessionToken(identity: string): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  const payload = `${identity}.${expiresAt}`
  return Buffer.from(`${payload}.${sign(payload)}`).toString('base64url')
}

export function verifySessionToken(token: string | undefined): { identity: string } | null {
  if (!token) {
    return null
  }

  let decoded: string
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8')
  } catch {
    return null
  }

  const parts = decoded.split('.')
  if (parts.length !== 3) {
    return null
  }

  const [identity, expiresAtRaw, signature] = parts
  const expiresAt = Number(expiresAtRaw)

  if (!identity || !Number.isFinite(expiresAt)) {
    return null
  }

  const expectedSignature = sign(`${identity}.${expiresAtRaw}`)
  const signatureBuffer = Buffer.from(signature, 'hex')
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null
  }

  if (Date.now() > expiresAt) {
    return null
  }

  return { identity }
}

export function isAuthenticatedCookie(cookieValue: string | undefined): boolean {
  return verifySessionToken(cookieValue) !== null
}
