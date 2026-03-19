import { createFluent } from '@fluenti/core'
import type {
  FluentInstanceExtended,
  FluentConfigExtended,
  Locale,
  Messages,
  DateFormatOptions,
  NumberFormatOptions,
} from '@fluenti/core'

// Re-export SSR utilities from core for convenience
export { detectLocale, getSSRLocaleScript, getHydratedLocale, isRTL, getDirection } from '@fluenti/core'
export type { DetectLocaleOptions } from '@fluenti/core'

/**
 * Configuration for `createServerI18n`.
 */
export interface ServerI18nConfig {
  /** Load messages for a given locale. Called once per locale per request. */
  loadMessages: (locale: string) => Promise<Messages | { default: Messages }>
  /** Fallback locale when a translation is missing */
  fallbackLocale?: string
  /**
   * Auto-resolve locale when `setLocale()` was not called.
   *
   * Common patterns for Vue/Nuxt SSR:
   * - Read from a cookie via `useCookie()` or `useRequestEvent()`
   * - Read from a request header set by middleware
   *
   * If omitted and `setLocale()` was not called, `getI18n()` will throw.
   */
  resolveLocale?: () => string | Promise<string>
  /** Custom fallback chains per locale */
  fallbackChain?: Record<string, Locale[]>
  /** Custom date format styles */
  dateFormats?: DateFormatOptions
  /** Custom number format styles */
  numberFormats?: NumberFormatOptions
  /** Handler for missing translation keys */
  missing?: (locale: Locale, id: string) => string | undefined
}

/**
 * The object returned by `createServerI18n`.
 */
export interface ServerI18n {
  /**
   * Set the locale for the current server request.
   * Call this once in your server plugin or middleware before any `getI18n()` calls.
   */
  setLocale: (locale: string) => void

  /**
   * Get a fully configured i18n instance for the current request.
   * Messages are loaded lazily and cached.
   */
  getI18n: () => Promise<FluentInstanceExtended & { locale: string }>
}

/**
 * Create server-side i18n utilities for Vue SSR / Nuxt.
 *
 * Uses a simple module-level store for locale state and message caching.
 * For per-request isolation in Nuxt, use `useRequestEvent()` in your
 * `resolveLocale` callback, or call `setLocale()` in a server plugin.
 *
 * **⚠️ SSR Concurrency Warning**: This function uses module-level state for locale
 * and cached instance. In concurrent SSR environments (e.g. multiple simultaneous
 * requests), this can cause cross-request locale leakage. For per-request isolation:
 * - Use `useRequestEvent()` in Nuxt to scope locale per request
 * - Or create a separate `createServerI18n()` per request context
 * - Consider using AsyncLocalStorage for true per-request isolation (future)
 *
 * @example
 * ```ts
 * // server/i18n.ts
 * import { createServerI18n } from '@fluenti/vue/server'
 *
 * export const { setLocale, getI18n } = createServerI18n({
 *   loadMessages: (locale) => import(`../locales/compiled/${locale}.ts`),
 *   fallbackLocale: 'en',
 * })
 * ```
 */
export function createServerI18n(config: ServerI18nConfig): ServerI18n {
  let currentLocale: string | null = null
  let cachedInstance: (FluentInstanceExtended & { locale: string }) | null = null
  const messageCache = new Map<string, Messages>()

  function setLocale(locale: string): void {
    currentLocale = locale
    cachedInstance = null
  }

  async function loadLocaleMessages(locale: string): Promise<Messages> {
    const cached = messageCache.get(locale)
    if (cached) return cached

    const raw = await config.loadMessages(locale)
    const messages: Messages =
      typeof raw === 'object' && raw !== null && 'default' in raw
        ? (raw as { default: Messages }).default
        : (raw as Messages)

    messageCache.set(locale, messages)
    return messages
  }

  async function getI18n(): Promise<FluentInstanceExtended & { locale: string }> {
    // If setLocale() was never called, try the resolveLocale fallback.
    if (!currentLocale && config.resolveLocale) {
      currentLocale = await config.resolveLocale()
    }

    const locale = currentLocale

    if (!locale) {
      throw new Error(
        '[fluenti] No locale set. Call setLocale(locale) in your server plugin or middleware before using getI18n(), ' +
          'or provide a resolveLocale function in createServerI18n config to auto-detect locale ' +
          'in server functions and other contexts where the layout does not run.',
      )
    }

    // Return cached instance if locale hasn't changed
    if (cachedInstance && cachedInstance.locale === locale) {
      return cachedInstance
    }

    // Load messages for current locale (and fallback if configured)
    const allMessages: Record<string, Messages> = {}
    allMessages[locale] = await loadLocaleMessages(locale)

    if (config.fallbackLocale && config.fallbackLocale !== locale) {
      allMessages[config.fallbackLocale] = await loadLocaleMessages(config.fallbackLocale)
    }

    const fluentConfig: FluentConfigExtended = {
      locale,
      messages: allMessages,
    }
    if (config.fallbackLocale !== undefined) fluentConfig.fallbackLocale = config.fallbackLocale
    if (config.fallbackChain !== undefined) fluentConfig.fallbackChain = config.fallbackChain
    if (config.dateFormats !== undefined) fluentConfig.dateFormats = config.dateFormats
    if (config.numberFormats !== undefined) fluentConfig.numberFormats = config.numberFormats
    if (config.missing !== undefined) fluentConfig.missing = config.missing

    cachedInstance = createFluent(fluentConfig)
    return cachedInstance
  }

  return { setLocale, getI18n }
}
