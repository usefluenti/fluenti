import type { DetectLocaleOptions, Locale } from './types'
import { negotiateLocale } from './locale'

/**
 * Detect the best locale from a server-side request context.
 *
 * Priority order: cookie > query > path > Accept-Language header > fallback
 */
export function detectLocale(options: DetectLocaleOptions): Locale {
  const { available, fallback } = options

  // 1. Cookie
  if (options.cookie) {
    if (isAvailable(options.cookie, available)) {
      return negotiateLocale(options.cookie, available)
    }
  }

  // 2. Query parameter
  if (options.query) {
    if (isAvailable(options.query, available)) {
      return negotiateLocale(options.query, available)
    }
  }

  // 3. Path segment
  if (options.path) {
    if (isAvailable(options.path, available)) {
      return negotiateLocale(options.path, available)
    }
  }

  // 4. Accept-Language header
  if (options.headers) {
    const acceptLang = getHeader(options.headers, 'accept-language')
    if (acceptLang) {
      const locales = parseAcceptLanguage(acceptLang)
      if (locales.length > 0) {
        return negotiateLocale(locales, available, fallback)
      }
    }
  }

  // 5. Fallback
  return fallback
}

/**
 * Check if a locale string matches any available locale (exact or language match).
 */
function isAvailable(locale: string, available: Locale[]): boolean {
  const lower = locale.toLowerCase()
  return available.some(a => {
    const aLower = a.toLowerCase()
    return aLower === lower || aLower.startsWith(lower + '-') || lower.startsWith(aLower + '-')
  })
}

/**
 * Get a header value from either a Headers object or a plain Record.
 */
function getHeader(
  headers: Headers | Record<string, string>,
  name: string,
): string | undefined {
  if (typeof headers === 'object' && headers !== null) {
    if ('get' in headers && typeof (headers as Headers).get === 'function') {
      return (headers as Headers).get(name) ?? undefined
    }
    // Plain object - case-insensitive lookup
    const lower = name.toLowerCase()
    for (const key of Object.keys(headers as Record<string, string>)) {
      if (key.toLowerCase() === lower) {
        return (headers as Record<string, string>)[key]
      }
    }
  }
  return undefined
}

/**
 * Parse an Accept-Language header into an ordered list of locales.
 *
 * @example
 * parseAcceptLanguage('en-US,en;q=0.9,zh-CN;q=0.8')
 * // -> ['en-US', 'en', 'zh-CN']
 */
function parseAcceptLanguage(header: string): Locale[] {
  return header
    .split(',')
    .map(part => {
      const [locale = '', ...rest] = part.trim().split(';')
      const qStr = rest.find(r => r.trim().startsWith('q='))
      const rawQ = qStr ? parseFloat(qStr.trim().slice(2)) : 1
      const q = Number.isNaN(rawQ) ? 0 : rawQ
      return { locale: locale.trim(), q }
    })
    .filter(entry => entry.locale && entry.locale !== '*')
    .sort((a, b) => b.q - a.q)
    .map(entry => entry.locale)
}

/**
 * Generate a `<script>` tag that injects the locale into the SSR HTML.
 *
 * Special characters are escaped to prevent XSS attacks.
 *
 * @example
 * getSSRLocaleScript('zh-CN')
 * // -> '<script>window.__FLUENTI_LOCALE__="zh-CN"</script>'
 */
export function getSSRLocaleScript(locale: Locale): string {
  const escaped = locale
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027')
  return `<script>window.__FLUENTI_LOCALE__="${escaped}"</script>`
}

/**
 * Read the SSR-injected locale from `window.__FLUENTI_LOCALE__`.
 *
 * Returns the locale if running in a browser and the variable exists,
 * otherwise returns the fallback (defaults to `'en'`).
 */
export function getHydratedLocale(fallback?: Locale): Locale {
  if (typeof window !== 'undefined') {
    const win = window as unknown as Record<string, unknown>
    if (typeof win['__FLUENTI_LOCALE__'] === 'string') {
      return win['__FLUENTI_LOCALE__']
    }
  }
  return fallback ?? 'en'
}
