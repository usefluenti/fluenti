import type { DetectLocaleOptions, Locale, SSRLocaleScriptOptions, HydratedLocaleOptions } from './types'
import { negotiateLocale, validateLocale } from './locale'

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
const MAX_ACCEPT_LANGUAGE_LENGTH = 1024

function parseAcceptLanguage(header: string): Locale[] {
  let safeHeader = header
  if (safeHeader.length > MAX_ACCEPT_LANGUAGE_LENGTH) {
    safeHeader = safeHeader.slice(0, MAX_ACCEPT_LANGUAGE_LENGTH)
    const lastComma = safeHeader.lastIndexOf(',')
    if (lastComma > 0) {
      safeHeader = safeHeader.slice(0, lastComma)
    }
  }

  return safeHeader
    .split(',')
    .map(part => {
      const [locale = '', ...rest] = part.trim().split(';')
      const qStr = rest.find(r => r.trim().startsWith('q='))
      const rawQ = qStr ? parseFloat(qStr.trim().slice(2)) : 1
      // Clamp q to [0, 1] per RFC 7231 §5.3.1; q=0 means "not acceptable" → exclude
      const q = Number.isNaN(rawQ) ? 0 : Math.min(1, Math.max(0, rawQ))
      return { locale: locale.trim(), q }
    })
    .filter(entry => entry.locale && entry.locale !== '*' && entry.q > 0)
    .sort((a, b) => b.q - a.q)
    .map(entry => entry.locale)
}

const DEFAULT_SSR_KEY = '__FLUENTI_LOCALE__'

/** Validate that a custom key is a safe JS identifier */
function validateSSRKey(key: string): void {
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
    throw new Error(`Invalid SSR key "${key}": must be a valid JavaScript identifier`)
  }
}

/**
 * Generate a `<script>` tag that injects the locale into the SSR HTML.
 *
 * Special characters are escaped to prevent XSS attacks.
 *
 * @param locale - BCP 47 locale code
 * @param options - Optional configuration (e.g. custom window variable key for multi-instance)
 *
 * @example
 * getSSRLocaleScript('zh-CN')
 * // -> '<script>window.__FLUENTI_LOCALE__="zh-CN"</script>'
 *
 * @example
 * // Multi-instance / micro-frontend
 * getSSRLocaleScript('ja', { key: '__MY_APP_LOCALE__' })
 * // -> '<script>window.__MY_APP_LOCALE__="ja"</script>'
 */
export function getSSRLocaleScript(locale: Locale, options?: SSRLocaleScriptOptions): string {
  if (locale.length > 255) {
    throw new Error(`getSSRLocaleScript: locale exceeds maximum length of 255 (got ${locale.length} characters)`)
  }
  validateLocale(locale, 'getSSRLocaleScript')

  const key = options?.key ?? DEFAULT_SSR_KEY
  if (key !== DEFAULT_SSR_KEY) {
    validateSSRKey(key)
  }

  const escaped = locale
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027')
  return `<script>window.${key}="${escaped}"</script>`
}

/**
 * Read the SSR-injected locale from the window variable.
 *
 * Returns the locale if running in a browser and the variable exists,
 * otherwise returns the fallback (defaults to `'en'`).
 *
 * @param fallback - Fallback locale if the window variable is not set (default: `'en'`)
 * @param options - Optional configuration (e.g. custom window variable key for multi-instance)
 *
 * @example
 * getHydratedLocale('en')
 *
 * @example
 * // Multi-instance — must match the key used in getSSRLocaleScript
 * getHydratedLocale('en', { key: '__MY_APP_LOCALE__' })
 */
export function getHydratedLocale(fallback?: Locale, options?: HydratedLocaleOptions): Locale {
  const key = options?.key ?? DEFAULT_SSR_KEY
  if (typeof window !== 'undefined') {
    const win = window as unknown as Record<string, unknown>
    if (typeof win[key] === 'string') {
      return win[key] as string
    }
  }
  return fallback ?? 'en'
}
