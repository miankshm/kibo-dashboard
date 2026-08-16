import { createNeonAuth } from '@neondatabase/auth/next/server'

const baseUrl = process.env.NEON_AUTH_BASE_URL
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET

if (!baseUrl || !cookieSecret) {
  console.warn('NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET must be configured.')
}

export const auth = createNeonAuth({
  baseUrl: baseUrl ?? '',
  cookies: {
    secret: cookieSecret ?? 'development-only-neon-auth-cookie-secret',
    sameSite: 'lax',
  },
})