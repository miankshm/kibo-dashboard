export const AUTH_COOKIE_NAME = 'kibo_session'
export const AUTH_IDENTITY_COOKIE_NAME = 'kibo_identity'
const AUTH_COOKIE_VALUE = 'authenticated'

export function isAuthenticatedCookie(cookieValue: string | undefined): boolean {
  return cookieValue === AUTH_COOKIE_VALUE
}

export function getAuthCookieValue(): string {
  return AUTH_COOKIE_VALUE
}

export function isValidInternalLogin(username: string, password: string): boolean {
  const expectedUsername = process.env.KIBO_LOGIN_USERNAME ?? 'admin'
  const expectedPassword = process.env.KIBO_LOGIN_PASSWORD ?? 'kibo1234'

  return username === expectedUsername && password === expectedPassword
}
