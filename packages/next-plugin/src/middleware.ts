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
 * @example Minimal — locales/sourceLocale/cookieName auto-read from fluenti.config.ts
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
 * @example With app/[locale]/ directory structure (rewriteDefaultLocale)
 * ```ts
 * import { NextResponse } from 'next/server'
 * import { createI18nMiddleware } from '@fluenti/next/middleware'
 *
 * export default createI18nMiddleware({ NextResponse, rewriteDefaultLocale: true })
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

// Auto-generated config values are resolved at Next.js build time via withFluenti's
// webpack/Turbopack alias: @fluenti/next/i18n-config → .fluenti/i18n-config.js
// This import is kept external (not bundled by tsup) so the alias can take effect.
import {
  locales as _configLocales,
  sourceLocale as _configSourceLocale,
  cookieName as _configCookieName,
} from '@fluenti/next/i18n-config'

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
  /**
   * When true, bare paths for the source locale are internally rewritten to include
   * the source locale prefix. Required when using `app/[locale]/` directory structure
   * with `localePrefix: 'as-needed'`.
   *
   * Also changes the handling of explicit source-locale URLs (e.g. `/en/about`):
   * instead of rewriting to `/about`, they are **redirected** to `/about` so the
   * browser follows the canonical URL, which is then rewritten internally.
   *
   * Example: `GET /about` → internally rewritten to `/en/about` (URL stays `/about`)
   * Example: `GET /en/about` → 302 redirect → `/about` → rewritten to `/en/about`
   *
   * Default: `false`
   */
  rewriteDefaultLocale?: boolean
  /**
   * When true, the detected locale is written to a `Set-Cookie` response header so the
   * preference is persisted across requests (useful when locale is detected from
   * `Accept-Language` rather than an existing cookie).
   *
   * Disabled by default to keep responses CDN-cacheable.
   *
   * The cookie is only written when the locale was **detected** (not read from the URL
   * path), and only when it differs from the existing cookie value.
   */
  setCookie?: boolean
  /**
   * Custom locale detection function. Called when no locale is present in the URL path.
   * Return a locale string to override the default cookie → Accept-Language → default chain.
   * Return `undefined` to fall through to built-in detection.
   *
   * Useful for JWT-based preferences, subdomain detection, or any custom logic.
   *
   * @example Subdomain detection
   * ```ts
   * detectLocale: (req) => {
   *   const host = req.headers.get('host') ?? ''
   *   if (host.startsWith('fr.')) return 'fr'
   * }
   * ```
   *
   * @example JWT claim
   * ```ts
   * detectLocale: (req) => {
   *   const token = req.cookies.get('auth')?.value
   *   return token ? parseLocaleFromJwt(token) : undefined
   * }
   * ```
   */
  detectLocale?: (req: NextRequest) => string | undefined
}

type NextRequest = {
  nextUrl: { pathname: string; search: string; basePath?: string }
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
 */
export function createI18nMiddleware(config: I18nMiddlewareConfig & { NextResponse: NextResponseStatic }) {
  const { NextResponse } = config
  const resolvedLocales: string[] = config.locales ?? _configLocales
  const resolvedSourceLocale: string = config.sourceLocale ?? _configSourceLocale
  const cookieName = config.cookieName ?? _configCookieName
  const localePrefix = config.localePrefix ?? 'as-needed'
  const rewriteDefaultLocale = config.rewriteDefaultLocale ?? false
  const setCookieEnabled = config.setCookie ?? false

  return function i18nMiddleware(request: NextRequest) {
    const locales = resolvedLocales
    const sourceLocale = resolvedSourceLocale
    const { pathname, search } = request.nextUrl
    const basePath = request.nextUrl.basePath ?? ''

    // Extract locale from URL path (case-insensitive — /ZH-CN → zh-CN)
    // Note: request.nextUrl.pathname already strips basePath (Next.js behavior)
    const segments = pathname.split('/')
    const firstSegment = segments[1] ?? ''
    const pathLocale = findLocale(firstSegment, locales)

    // Determine the active locale
    let locale: string

    if (pathLocale) {
      locale = pathLocale
    } else {
      // No locale in path — try custom detection first, then cookie → Accept-Language → default
      const custom = config.detectLocale?.(request)
      locale =
        custom !== undefined && findLocale(custom, locales) !== null
          ? findLocale(custom, locales)!
          : detectLocale(request, locales, sourceLocale, cookieName)
    }

    // Build new request headers preserving originals (auth headers, etc.)
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set(LOCALE_HEADER, locale)

    // Case 1: No locale in path → redirect to /{locale}{path}
    // In 'always' mode: redirect all bare paths (including source locale)
    // In 'as-needed' mode: only redirect non-source locales
    if (!pathLocale && (localePrefix === 'always' || locale !== sourceLocale)) {
      const redirectUrl = new URL(
        `${basePath}/${locale}${pathname}${search}`,
        request.url,
      )
      const response = NextResponse.redirect(redirectUrl)
      response.headers.set(LOCALE_HEADER, locale)
      maybeSetCookie(response, request, locale, cookieName, setCookieEnabled, pathLocale)
      return response
    }

    // Case 2: as-needed + no prefix + source locale + rewriteDefaultLocale
    // → internally rewrite to /{sourceLocale}{path} so Next.js matches [locale] segment
    // Use `pathname` directly (preserves trailing slash for trailingSlash:true compat)
    if (!pathLocale && locale === sourceLocale && rewriteDefaultLocale) {
      const rewriteUrl = new URL(
        `${basePath}/${sourceLocale}${pathname}${search}`,
        request.url,
      )
      const response = NextResponse.rewrite(rewriteUrl, {
        request: { headers: requestHeaders },
      })
      response.headers.set(LOCALE_HEADER, locale)
      maybeSetCookie(response, request, locale, cookieName, setCookieEnabled, pathLocale)
      return response
    }

    // Case 3: as-needed mode, source locale has explicit prefix → strip it
    // rewriteDefaultLocale=false: rewrite to /about (flat app/about/ structure)
    // rewriteDefaultLocale=true:  redirect to /about (browser re-requests, Case 2 rewrites)
    if (localePrefix === 'as-needed' && pathLocale === sourceLocale) {
      const pathWithoutLocale = ('/' + segments.slice(2).join('/')).replace(/\/+/g, '/')
      if (rewriteDefaultLocale) {
        const redirectUrl = new URL(
          `${basePath}${pathWithoutLocale}${search}`,
          request.url,
        )
        const response = NextResponse.redirect(redirectUrl)
        response.headers.set(LOCALE_HEADER, locale)
        return response
      }
      const rewriteUrl = new URL(
        `${basePath}${pathWithoutLocale}${search}`,
        request.url,
      )
      const response = NextResponse.rewrite(rewriteUrl, {
        request: { headers: requestHeaders },
      })
      response.headers.set(LOCALE_HEADER, locale)
      return response
    }

    // Case 4: No prefix + source locale (rewriteDefaultLocale=false) → pass through
    // Case 5: Non-source locale with correct prefix → pass through
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    })
    response.headers.set(LOCALE_HEADER, locale)
    maybeSetCookie(response, request, locale, cookieName, setCookieEnabled, pathLocale)

    return response
  }
}

/**
 * Case-insensitive locale lookup. Returns the canonical form from the locales array,
 * or null if not found. Handles BCP 47 case variance (e.g. zh-cn → zh-CN).
 */
function findLocale(candidate: string, locales: string[]): string | null {
  if (!candidate) return null
  const lower = candidate.toLowerCase()
  return locales.find(l => l.toLowerCase() === lower) ?? null
}

/**
 * Conditionally add a Set-Cookie header to persist the detected locale.
 * Only writes when setCookie is enabled, locale was not from URL path,
 * and cookie value differs from detected locale.
 */
function maybeSetCookie(
  response: NextResponseInstance,
  request: NextRequest,
  locale: string,
  cookieName: string,
  setCookie: boolean,
  pathLocale: string | null,
): void {
  if (!setCookie || pathLocale) return
  if (request.cookies.get(cookieName)?.value === locale) return
  response.headers.set(
    'set-cookie',
    `${cookieName}=${locale};path=/;max-age=31536000;samesite=lax`,
  )
}

/**
 * Detect locale from request: cookie → Accept-Language → default.
 * All comparisons are case-insensitive (BCP 47).
 */
function detectLocale(
  request: NextRequest,
  locales: string[],
  defaultLocale: string,
  cookieName: string,
): string {
  // 1. Cookie (user preference) — case-insensitive
  const cookieLocale = request.cookies.get(cookieName)?.value
  if (cookieLocale) {
    const found = findLocale(cookieLocale, locales)
    if (found) return found
  }

  // 2. Accept-Language header — case-insensitive
  const acceptLang = request.headers.get('accept-language')
  if (acceptLang) {
    for (const part of acceptLang.split(',')) {
      const lang = part.split(';')[0]!.trim()
      const exact = findLocale(lang, locales)
      if (exact) return exact
      const prefix = lang.split('-')[0]!.toLowerCase()
      const match = locales.find(l => {
        const ll = l.toLowerCase()
        return ll === prefix || ll.startsWith(prefix + '-')
      })
      if (match) return match
    }
  }

  // 3. Default
  return defaultLocale
}
