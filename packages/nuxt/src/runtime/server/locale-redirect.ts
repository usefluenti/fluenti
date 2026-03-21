import { defineEventHandler, sendRedirect, getHeader, getCookie, getQuery } from 'h3'

/**
 * Nitro server middleware for locale-based redirects.
 *
 * Runs at the Nitro layer (before Vue Router), which is earlier in the
 * request lifecycle. This prevents any flash of wrong-locale content
 * during SSR, as the redirect happens before page rendering starts.
 *
 * Only active when strategy is 'prefix' or 'prefix_and_default'.
 */
export default defineEventHandler((event) => {
  const url = event.path ?? '/'

  // Skip non-page requests (assets, API routes, etc.)
  if (url.startsWith('/_nuxt/') || url.startsWith('/api/') || url.startsWith('/__nuxt')) {
    return
  }

  // Skip if URL already has a file extension (static assets)
  if (/\.\w{2,5}$/.test(url)) {
    return
  }

  // Read config from runtime config
  const config = (event.context['__fluenti_config'] ??
    useRuntimeConfigFromEvent(event)) as {
    locales: string[]
    defaultLocale: string
    strategy: string
    detectOrder?: string[]
    queryParamKey?: string
    detectBrowserLanguage?: { useCookie?: boolean; cookieKey?: string; fallbackLocale?: string }
  } | undefined

  if (!config) return

  // Only handle prefix/prefix_and_default strategies
  if (config.strategy !== 'prefix' && config.strategy !== 'prefix_and_default') {
    return
  }

  // Check if the URL already has a locale prefix
  const pathSegments = url.split('/').filter(Boolean)
  const firstSegment = pathSegments[0]

  if (firstSegment && config.locales.includes(firstSegment)) {
    // URL already has a valid locale prefix
    return
  }

  // For prefix_and_default, unprefixed URLs are allowed for the default locale
  // (they will be served without redirect)
  // For prefix strategy, we must redirect

  // Detect locale from various sources
  let detectedLocale = config.defaultLocale

  // 1. Query parameter
  const queryKey = config.queryParamKey ?? 'locale'
  const query = getQuery(event)
  const queryLocale = query[queryKey]
  if (typeof queryLocale === 'string' && config.locales.includes(queryLocale)) {
    detectedLocale = queryLocale
  }

  // 2. Cookie
  if (!queryLocale) {
    const cookieKey = config.detectBrowserLanguage?.cookieKey ?? 'fluenti_locale'
    const cookieLocale = getCookie(event, cookieKey)
    if (cookieLocale && config.locales.includes(cookieLocale)) {
      detectedLocale = cookieLocale
    }
  }

  // 3. Accept-Language header
  if (!queryLocale) {
    const acceptLang = getHeader(event, 'accept-language')
    if (acceptLang) {
      const preferred = parseAcceptLanguage(acceptLang, config.locales)
      if (preferred) {
        detectedLocale = preferred
      }
    }
  }

  // Redirect to locale-prefixed URL
  const cleanUrl = url === '/' ? '' : url
  const redirectUrl = `/${detectedLocale}${cleanUrl}`

  return sendRedirect(event, redirectUrl, 302)
})

/**
 * Parse Accept-Language header and find the best matching locale.
 */
function parseAcceptLanguage(header: string, locales: string[]): string | null {
  const entries = header
    .split(',')
    .map((part) => {
      const [lang = '', q = ''] = part.trim().split(';q=')
      return {
        lang: lang!.trim().toLowerCase(),
        quality: q ? parseFloat(q) : 1.0,
      }
    })
    .filter((e) => e.quality > 0)
    .sort((a, b) => b.quality - a.quality)

  for (const entry of entries) {
    // Exact match
    const exact = locales.find((l) => l.toLowerCase() === entry.lang)
    if (exact) return exact

    // Prefix match (e.g., 'en' matches 'en-US')
    const prefix = locales.find(
      (l) => l.toLowerCase().startsWith(entry.lang) || entry.lang.startsWith(l.toLowerCase()),
    )
    if (prefix) return prefix
  }

  return null
}

/**
 * Read Fluenti runtime config from the event context.
 */
function useRuntimeConfigFromEvent(event: { context: Record<string, unknown> }) {
  try {
    const nitroConfig = (event.context['nitro'] ?? event.context['__nitro']) as Record<string, unknown> | undefined
    const runtimeConfig = (nitroConfig?.['runtimeConfig'] ?? {}) as Record<string, unknown>
    const publicConfig = (runtimeConfig['public'] ?? {}) as Record<string, unknown>
    const fluentiConfig = publicConfig['fluenti']
    if (fluentiConfig) {
      event.context['__fluenti_config'] = fluentiConfig
    }
    return fluentiConfig
  } catch {
    return undefined
  }
}
