import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, isAuthenticatedCookie } from '@/lib/auth'

const PUBLIC_PATHS = new Set(['/login'])

function isPublicFile(pathname: string): boolean {
  return /\.[^/]+$/.test(pathname)
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || isPublicFile(pathname)) {
    return NextResponse.next()
  }

  const isLoggedIn = isAuthenticatedCookie(request.cookies.get(AUTH_COOKIE_NAME)?.value)

  if (PUBLIC_PATHS.has(pathname)) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
  }

  if (!isLoggedIn) {
    const loginUrl = new URL('/login', request.url)
    const fullPath = `${pathname}${search}`
    loginUrl.searchParams.set('next', fullPath)

    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/:path*',
}
