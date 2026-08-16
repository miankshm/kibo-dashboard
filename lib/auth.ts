export const AUTH_COOKIE_NAME = 'kibo_session'
export const AUTH_IDENTITY_COOKIE_NAME = 'kibo_identity'

export function isAuthenticatedCookie(cookieValue: string | undefined): boolean {
  return Boolean(cookieValue)
}
