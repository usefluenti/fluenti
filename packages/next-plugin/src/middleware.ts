/**
 * @module @fluenti/next/middleware
 *
 * Built-in i18n middleware for Next.js App Router.
 *
 * Uses `x-fluenti-locale` request header to pass locale from middleware to
 * server components — avoids `Set-Cookie` on every request (CDN-friendly).
 *
 * @example Minimal
 * ```ts
 * import { NextResponse } from 'next/server'
 * import { createI18nMiddleware } from '@fluenti/next/middleware'
 *
 * export default createI18nMiddleware({ NextResponse })
 * ```
 *
 * @example With pathnames + alternateLinks + domains
 * ```ts
 * import { NextResponse } from 'next/server'
 * import { createI18nMiddleware } from '@fluenti/next/middleware'
 *
 * export default createI18nMiddleware({
 *   NextResponse,
 *   rewriteDefaultLocale: true,
 *   alternateLinks: true,
 *   pathnames: {
 *     '/about': { fr: '/a-propos' },
 *     '/blog/[slug]': { fr: '/articles/[slug]' },
 *   },
 *   domains: [
 *     { domain: 'fr.example.com', defaultLocale: 'fr' },
 *   ],
 * })
 * ```
 */

import {
  locales as _configLocales,
  sourceLocale as _configSourceLocale,
  cookieName as _configCookieName,
} from '@fluenti/next/i18n-config'

/** Header name used to pass resolved locale from middleware to RSC */
export const LOCALE_HEADER = 'x-fluenti-locale'

export interface CookieOptions {
  /** Cookie domain (e.g. '.example.com' for cross-subdomain) */
  domain?: string
  /** Secure flag (default: auto-detect from request URL) */
  secure?: boolean
  /** SameSite attribute (default: 'lax') */
  sameSite?: 'lax' | 'strict' | 'none'
  /** Max age in seconds (default: 31536000 = 1 year) */
  maxAge?: number
  /** Cookie path (default: '/') */
  path?: string
}

export interface DomainConfig {
  /** Domain hostname (e.g. 'fr.example.com') */
  domain: string
  /** Default locale for this domain */
  defaultLocale: string
  /** Optional subset of locales available on this domain */
  locales?: string[]
}

export interface AlternateLinkEntry {
  href: string
  hreflang: string
}

export interface I18nMiddlewareConfig {
  /** Available locales. If omitted, reads from `fluenti.config.ts`. */
  locales?: string[]
  /** Source/default locale. If omitted, reads from `fluenti.config.ts`. */
  sourceLocale?: string
  /** Cookie name for reading user preference (default: 'locale') */
  cookieName?: string
  /**
   * Locale prefix strategy:
   * - `'always'`: all locales get a URL prefix
   * - `'as-needed'`: source locale has no prefix, others do
   * - `'never'`: no locale prefix in URLs; locale determined by detection chain
   *
   * Default: `'as-needed'`
   */
  localePrefix?: 'always' | 'as-needed' | 'never'
  /**
   * When true, bare paths are internally rewritten to include the locale prefix.
   * Required when using `app/[locale]/` directory structure.
   *
   * Default: `false`
   */
  rewriteDefaultLocale?: boolean
  /**
   * When true, detected locale is persisted in a cookie.
   * Disabled by default to keep responses CDN-cacheable.
   */
  setCookie?: boolean
  /** Fine-grained cookie configuration for multi-domain / secure deployments. */
  cookieOptions?: CookieOptions
  /**
   * Set to false to disable automatic locale detection.
   * Bare paths will always use `sourceLocale` instead of detecting from cookie / Accept-Language.
   *
   * Default: `true`
   */
  localeDetection?: boolean
  /**
   * Custom locale detection function. Called when no locale is present in the URL path.
   * Return a locale string to override the default chain, or `undefined` to fall through.
   */
  detectLocale?: (req: NextRequest) => string | undefined
  /**
   * Domain-based locale routing. Each domain maps to a default locale.
   * Domain matching is checked before cookie/Accept-Language detection.
   *
   * @example
   * ```ts
   * domains: [
   *   { domain: 'fr.example.com', defaultLocale: 'fr' },
   *   { domain: 'example.co.jp', defaultLocale: 'ja' },
   * ]
   * ```
   */
  domains?: DomainConfig[]
  /**
   * Map internal paths to localized paths per locale.
   * Supports dynamic segments: `[param]` and `[...slug]`.
   *
   * @example
   * ```ts
   * pathnames: {
   *   '/about': { fr: '/a-propos' },
   *   '/blog/[slug]': { fr: '/articles/[slug]' },
   * }
   * ```
   */
  pathnames?: Record<string, Record<string, string>>
  /**
   * When true, adds `Link` response headers with `rel="alternate"` hreflang
   * and `rel="canonical"` for SEO.
   *
   * Default: `false`
   */
  alternateLinks?: boolean
  /**
   * Custom function to build alternate link entries. Overrides default `alternateLinks` behavior.
   * Return an array of `{ href, hreflang }` entries.
   */
  getAlternateLinks?: (context: {
    pathname: string
    locale: string
    locales: string[]
    origin: string
    basePath: string
  }) => AlternateLinkEntry[]
  /**
   * Called before the middleware returns a response.
   * Modify headers, cookies, or return a replacement response.
   */
  beforeResponse?: (context: {
    response: NextResponseInstance
    request: NextRequest
    locale: string
    type: 'redirect' | 'rewrite' | 'next'
  }) => NextResponseInstance | void | undefined
}

/** Minimal request shape required by the middleware. Pass the real NextRequest for full type access in detectLocale. */
type NextRequest = {
  nextUrl: { pathname: string; search: string; basePath?: string }
  url: string
  cookies: { get(name: string): { value: string } | undefined }
  headers: Headers
  [key: string]: unknown  // Allow accessing .geo, .ip, etc. without type assertion
}

type NextResponseStatic<R extends NextResponseInstance = NextResponseInstance> = {
  redirect(url: URL): R
  rewrite(url: URL, init?: Record<string, unknown>): R
  next(init?: Record<string, unknown>): R
}

type NextResponseInstance = {
  headers: { set(name: string, value: string): void }
}

/**
 * Create an i18n middleware function for Next.js.
 */
export function createI18nMiddleware<R extends NextResponseInstance = NextResponseInstance>(
  config: I18nMiddlewareConfig & { NextResponse: NextResponseStatic<R> },
) {
  const { NextResponse } = config
  const resolvedLocales: string[] = config.locales ?? _configLocales
  const resolvedSourceLocale: string = config.sourceLocale ?? _configSourceLocale
  const cookieName = config.cookieName ?? _configCookieName
  const localePrefix = config.localePrefix ?? 'as-needed'
  const rewriteDefaultLocale = config.rewriteDefaultLocale ?? false
  const setCookieEnabled = config.setCookie ?? false
  const cookieOpts: CookieOptions = config.cookieOptions ?? {}
  const localeDetectionEnabled = config.localeDetection ?? true
  const alternateLinksEnabled = config.alternateLinks ?? false
  const pathnamesMap = config.pathnames
  const domainsConfig = config.domains
  const beforeResponse = config.beforeResponse

  function finalizeResponse(
    response: R,
    request: NextRequest,
    locale: string,
    type: 'redirect' | 'rewrite' | 'next',
    pathLocale: string | null,
  ): R {
    response.headers.set(LOCALE_HEADER, locale)
    if (setCookieEnabled) {
      maybeSetCookie(response, request, locale, cookieName, pathLocale, cookieOpts)
    }
    if (alternateLinksEnabled || config.getAlternateLinks) {
      const linkHeader = config.getAlternateLinks
        ? buildCustomAlternateLinks(config.getAlternateLinks, request, locale, resolvedLocales)
        : buildAlternateLinks(request, resolvedLocales, resolvedSourceLocale, localePrefix, request.nextUrl.basePath ?? '', pathnamesMap)
      response.headers.set('Link', linkHeader)
    }
    if (beforeResponse) {
      const replacement = beforeResponse({ response, request, locale, type })
      if (replacement) return replacement as R
    }
    return response
  }

  return function i18nMiddleware(request: NextRequest): R {
    const locales = resolvedLocales
    const sourceLocale = resolvedSourceLocale
    const { pathname, search } = request.nextUrl
    const basePath = request.nextUrl.basePath ?? ''

    // Extract locale from URL path ('never' mode skips this)
    const segments = pathname.split('/')
    const firstSegment = segments[1] ?? ''
    const pathLocale = localePrefix === 'never' ? null : findLocale(firstSegment, locales)

    // Determine the active locale
    let locale: string

    if (pathLocale) {
      locale = pathLocale
    } else if (!localeDetectionEnabled) {
      locale = sourceLocale
    } else {
      // Detection chain: custom → domains → cookie → Accept-Language → default
      const custom = config.detectLocale?.(request)
      if (custom !== undefined && findLocale(custom, locales) !== null) {
        locale = findLocale(custom, locales)!
      } else if (domainsConfig) {
        const domainLocale = detectFromDomain(request, domainsConfig, locales)
        locale = domainLocale ?? detectLocale(request, locales, sourceLocale, cookieName)
      } else {
        locale = detectLocale(request, locales, sourceLocale, cookieName)
      }
    }

    // Build request headers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set(LOCALE_HEADER, locale)

    // ── 'never' mode ──────────────────────────────────────────────────────
    if (localePrefix === 'never') {
      if (rewriteDefaultLocale) {
        const rewriteUrl = new URL(`${basePath}/${locale}${pathname}${search}`, request.url)
        return finalizeResponse(
          NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } }),
          request, locale, 'rewrite', null,
        )
      }
      return finalizeResponse(
        NextResponse.next({ request: { headers: requestHeaders } }),
        request, locale, 'next', null,
      )
    }

    // ── Pathnames mapping ─────────────────────────────────────────────────
    if (pathnamesMap && pathLocale) {
      const pathWithoutLocale = normalizeSlashes('/' + segments.slice(2).join('/'))
      const internalPath = resolveInternalPath(pathWithoutLocale, locale, pathnamesMap)

      if (internalPath) {
        const rewriteUrl = new URL(`${basePath}/${locale}${internalPath}${search}`, request.url)
        return finalizeResponse(
          NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } }),
          request, locale, 'rewrite', pathLocale,
        )
      }

      const localizedPath = resolveLocalizedPath(pathWithoutLocale, locale, pathnamesMap)
      if (localizedPath && localizedPath !== pathWithoutLocale) {
        const redirectUrl = new URL(`${basePath}/${locale}${localizedPath}${search}`, request.url)
        return finalizeResponse(
          NextResponse.redirect(redirectUrl),
          request, locale, 'redirect', pathLocale,
        )
      }
    }

    // ── Case 1: No locale in path → redirect ──────────────────────────────
    if (!pathLocale && (localePrefix === 'always' || locale !== sourceLocale)) {
      // If pathnames configured, redirect to localized path
      let targetPath = pathname
      if (pathnamesMap) {
        const localized = resolveLocalizedPath(pathname, locale, pathnamesMap)
        if (localized) targetPath = localized
      }
      const redirectUrl = new URL(`${basePath}/${locale}${targetPath}${search}`, request.url)
      return finalizeResponse(
        NextResponse.redirect(redirectUrl),
        request, locale, 'redirect', pathLocale,
      )
    }

    // ── Case 2: as-needed + source locale + rewriteDefaultLocale ──────────
    if (!pathLocale && locale === sourceLocale && rewriteDefaultLocale) {
      const rewriteUrl = new URL(`${basePath}/${sourceLocale}${pathname}${search}`, request.url)
      return finalizeResponse(
        NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } }),
        request, locale, 'rewrite', pathLocale,
      )
    }

    // ── Case 3: as-needed, source locale has explicit prefix → strip ──────
    if (localePrefix === 'as-needed' && pathLocale === sourceLocale) {
      const pathWithoutLocale = normalizeSlashes('/' + segments.slice(2).join('/'))
      if (rewriteDefaultLocale) {
        const redirectUrl = new URL(`${basePath}${pathWithoutLocale}${search}`, request.url)
        return finalizeResponse(
          NextResponse.redirect(redirectUrl),
          request, locale, 'redirect', pathLocale,
        )
      }
      const rewriteUrl = new URL(`${basePath}${pathWithoutLocale}${search}`, request.url)
      return finalizeResponse(
        NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } }),
        request, locale, 'rewrite', pathLocale,
      )
    }

    // ── Case 4/5: pass through ────────────────────────────────────────────
    return finalizeResponse(
      NextResponse.next({ request: { headers: requestHeaders } }),
      request, locale, 'next', pathLocale,
    )
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function findLocale(candidate: string, locales: string[]): string | null {
  if (!candidate) return null
  const lower = candidate.toLowerCase()
  return locales.find(l => l.toLowerCase() === lower) ?? null
}

function normalizeSlashes(path: string): string {
  return path.replace(/\/+/g, '/') || '/'
}

function maybeSetCookie(
  response: NextResponseInstance,
  request: NextRequest,
  locale: string,
  cookieName: string,
  pathLocale: string | null,
  opts: CookieOptions,
): void {
  if (pathLocale) return
  if (request.cookies.get(cookieName)?.value === locale) return

  const parts = [`${cookieName}=${encodeURIComponent(locale)}`]
  parts.push(`path=${opts.path ?? '/'}`)
  parts.push(`max-age=${opts.maxAge ?? 31536000}`)
  parts.push(`samesite=${opts.sameSite ?? 'lax'}`)
  if (opts.domain) parts.push(`domain=${opts.domain}`)
  if (opts.secure ?? request.url.startsWith('https')) parts.push('secure')
  response.headers.set('set-cookie', parts.join(';'))
}

function detectFromDomain(
  request: NextRequest,
  domains: DomainConfig[],
  locales: string[],
): string | null {
  const host = request.headers.get('host')?.split(':')[0] ?? ''
  for (const d of domains) {
    if (host === d.domain || host.endsWith('.' + d.domain)) {
      const found = findLocale(d.defaultLocale, d.locales ?? locales)
      if (found) return found
    }
  }
  return null
}

function detectLocale(
  request: NextRequest,
  locales: string[],
  defaultLocale: string,
  cookieName: string,
): string {
  const cookieLocale = request.cookies.get(cookieName)?.value
  if (cookieLocale) {
    const found = findLocale(cookieLocale, locales)
    if (found) return found
  }

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

  return defaultLocale
}

function stripLocalePrefix(pathname: string, locales: string[]): string {
  const segments = pathname.split('/')
  const first = segments[1] ?? ''
  if (findLocale(first, locales)) {
    return normalizeSlashes('/' + segments.slice(2).join('/'))
  }
  return pathname
}

// Path resolution utilities imported from shared routing module
// (bundled by tsup, safe for Edge Runtime)
import { resolveInternalPath, resolveLocalizedPath } from './routing'

function buildAlternateLinks(
  request: NextRequest,
  locales: string[],
  sourceLocale: string,
  localePrefix: 'always' | 'as-needed' | 'never',
  basePath: string,
  pathnames?: Record<string, Record<string, string>>,
): string {
  const origin = new URL(request.url).origin
  const cleanPath = stripLocalePrefix(request.nextUrl.pathname, locales)

  const links = locales.map(loc => {
    let localePath: string
    if (localePrefix === 'never') {
      localePath = cleanPath
    } else if (localePrefix === 'as-needed' && loc === sourceLocale) {
      localePath = cleanPath
    } else {
      localePath = `/${loc}${cleanPath}`
    }
    if (pathnames) {
      const mapped = resolveLocalizedPath(cleanPath, loc, pathnames)
      if (mapped) {
        localePath = localePrefix === 'never' || (localePrefix === 'as-needed' && loc === sourceLocale)
          ? mapped
          : `/${loc}${mapped}`
      }
    }
    return `<${origin}${basePath}${localePath}>; rel="alternate"; hreflang="${loc}"`
  })

  // x-default
  const defaultPath = localePrefix === 'always' ? `/${sourceLocale}${cleanPath}` : cleanPath
  links.push(`<${origin}${basePath}${defaultPath}>; rel="alternate"; hreflang="x-default"`)

  return links.join(', ')
}

function buildCustomAlternateLinks(
  getAlternateLinks: NonNullable<I18nMiddlewareConfig['getAlternateLinks']>,
  request: NextRequest,
  locale: string,
  locales: string[],
): string {
  const origin = new URL(request.url).origin
  const cleanPath = stripLocalePrefix(request.nextUrl.pathname, locales)
  const basePath = request.nextUrl.basePath ?? ''
  const entries = getAlternateLinks({ pathname: cleanPath, locale, locales, origin, basePath })
  return entries.map(e => `<${e.href}>; rel="alternate"; hreflang="${e.hreflang}"`).join(', ')
}
