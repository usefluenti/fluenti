import { NextResponse, type NextRequest } from 'next/server'

const locales = ['en', 'zh-CN', 'ja']
const defaultLocale = 'en'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the pathname already has a locale prefix
  const hasLocale = locales.some(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
  )
  if (hasLocale) {
    // Sync the locale cookie from the URL path so server components
    // (e.g. generateMetadata, resolveLocale) can read it
    const pathLocale = locales.find(
      (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
    )!
    const response = NextResponse.next()
    response.cookies.set('locale', pathLocale, { path: '/', maxAge: 31536000 })
    return response
  }

  // Determine locale from cookie, fallback to default
  const locale = request.cookies.get('locale')?.value ?? defaultLocale

  return NextResponse.redirect(
    new URL(`/${locale}${pathname}`, request.url),
  )
}

export const config = {
  matcher: ['/((?!_next|api|favicon).*)'],
}
