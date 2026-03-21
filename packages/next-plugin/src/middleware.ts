/**
 * @module @fluenti/next/middleware
 *
 * Built-in i18n middleware for Next.js App Router.
 *
 * Uses `x-fluenti-locale` request header to pass locale from middleware to
 * server components — avoids `Set-Cookie` on every request (CDN-friendly).
 *
 * Cookie is only used to remember user preference (set by LocaleSwitcher).
 *
 * @example
 * ```ts
 * // src/middleware.ts
 * import { NextResponse } from 'next/server'
 * import { createI18nMiddleware } from '@fluenti/next/middleware'
 *
 * export default createI18nMiddleware({ NextResponse })
 *
 * export const config = {
 *   matcher: ['/((?!_next|api|favicon).*)'],
 * }
 * ```
 *
 * @example Composing with Clerk
 * ```ts
 * import { NextResponse } from 'next/server'
 * import { clerkMiddleware } from '@clerk/nextjs/server'
 * import { createI18nMiddleware } from '@fluenti/next/middleware'
 *
 * const i18nMiddleware = createI18nMiddleware({ NextResponse })
 *
 * export default clerkMiddleware(async (auth, req) => {
 *   await auth.protect()
 *   return i18nMiddleware(req)
 * })
 * ```
 */

/** Header name used to pass resolved locale from middleware to RSC */
export const LOCALE_HEADER = 'x-fluenti-locale'

export interface I18nMiddlewareConfig {
  /** Available locales. If omitted, reads from `fluenti.config.ts`. */
  locales?: string[]
  /** Source/default locale. If omitted, reads from `fluenti.config.ts`. */
  sourceLocale?: string
  /** Cookie name for reading user preference (default: 'locale') */
  cookieName?: string
  /**
   * Locale prefix strategy:
   * - `'always'`: all locales get a URL prefix (e.g. `/en/about`, `/fr/about`)
   * - `'as-needed'`: source locale has no prefix, others do (e.g. `/about`, `/fr/about`)
   *
   * Default: `'as-needed'`
   */
  localePrefix?: 'always' | 'as-needed'
}

type NextRequest = {
  nextUrl: { pathname: string; search: string }
  url: string
  cookies: { get(name: string): { value: string } | undefined }
  headers: Headers
}

type NextResponseStatic = {
  redirect(url: URL): NextResponseInstance
  rewrite(url: URL, init?: Record<string, unknown>): NextResponseInstance
  next(init?: Record<string, unknown>): NextResponseInstance
}

type NextResponseInstance = {
  headers: { set(name: string, value: string): void }
}

/**
 * Create an i18n middleware function for Next.js.
 *
 * Requires `NextResponse` to be passed in because the middleware module runs
 * in Next.js Edge Runtime where `require('next/server')` is not available.
 *
 * @example
 * ```ts
 * import { NextResponse } from 'next/server'
 * import { createI18nMiddleware } from '@fluenti/next/middleware'
 *
 * export default createI18nMiddleware({ NextResponse })
 * ```
 *
 * @example With explicit locales
 * ```ts
 * import { NextResponse } from 'next/server'
 * import { createI18nMiddleware } from '@fluenti/next/middleware'
 *
 * export default createI18nMiddleware({
 *   NextResponse,
 *   locales: ['en', 'ja', 'zh-CN'],
 *   sourceLocale: 'en',
 * })
 * ```
 */
export function createI18nMiddleware(config: I18nMiddlewareConfig & { NextResponse: NextResponseStatic }) {
  const { NextResponse } = config
  const resolvedLocales: string[] = config.locales ?? ['en']
  const resolvedSourceLocale: string = config.sourceLocale ?? 'en'
  const cookieName = config.cookieName ?? 'locale'
  const localePrefix = config.localePrefix ?? 'as-needed'

  return function i18nMiddleware(request: NextRequest) {
    const locales = resolvedLocales
    const sourceLocale = resolvedSourceLocale
    const { pathname } = request.nextUrl

    // Extract locale from URL path
    // Note: request.nextUrl.pathname already strips basePath (Next.js behavior)
    const segments = pathname.split('/')
    const firstSegment = segments[1] ?? ''
    const pathLocale = locales.includes(firstSegment) ? firstSegment : null

    // Determine the active locale
    let locale: string

    if (pathLocale) {
      locale = pathLocale
    } else {
      // No locale in path — detect from cookie → Accept-Language → default
      locale = detectLocale(request, locales, sourceLocale, cookieName)
    }

    // Build new request headers preserving originals (auth headers, etc.)
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set(LOCALE_HEADER, locale)

    // Case 1: No locale in path → redirect to /{locale}{path}
    // In 'always' mode: redirect all bare paths (including source locale)
    // In 'as-needed' mode: only redirect non-source locales
    if (!pathLocale && (localePrefix === 'always' || locale !== sourceLocale)) {
      const redirectUrl = new URL(
        `/${locale}${pathname}${request.nextUrl.search}`,
        request.url,
      )
      const response = NextResponse.redirect(redirectUrl)
      response.headers.set(LOCALE_HEADER, locale)
      return response
    }

    // Case 2: as-needed mode, default locale has prefix → rewrite without prefix
    if (localePrefix === 'as-needed' && pathLocale === sourceLocale) {
      const pathWithoutLocale = '/' + segments.slice(2).join('/')
      const rewriteUrl = new URL(
        `${pathWithoutLocale}${request.nextUrl.search}`,
        request.url,
      )
      const response = NextResponse.rewrite(rewriteUrl, {
        request: { headers: requestHeaders },
      })
      response.headers.set(LOCALE_HEADER, locale)
      return response
    }

    // Case 3: No locale in path, source locale → pass through with header
    // Case 4: Non-default locale with correct prefix → pass through
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    })
    response.headers.set(LOCALE_HEADER, locale)

    return response
  }
}

/**
 * Detect locale from request: cookie → Accept-Language → default.
 */
function detectLocale(
  request: NextRequest,
  locales: string[],
  defaultLocale: string,
  cookieName: string,
): string {
  // 1. Cookie (user preference)
  const cookieLocale = request.cookies.get(cookieName)?.value
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale
  }

  // 2. Accept-Language header
  const acceptLang = request.headers.get('accept-language')
  if (acceptLang) {
    for (const part of acceptLang.split(',')) {
      const lang = part.split(';')[0]!.trim()
      if (locales.includes(lang)) return lang
      const prefix = lang.split('-')[0]!
      const match = locales.find(l => l === prefix || l.startsWith(prefix + '-'))
      if (match) return match
    }
  }

  // 3. Default
  return defaultLocale
}
