import { AsyncLocalStorage } from 'node:async_hooks'
import { createFluentiCore } from '@fluenti/core'
import type {
  FluentiCoreInstanceFull,
  FluentiCoreConfigFull,
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
  getI18n: () => Promise<FluentiCoreInstanceFull & { locale: string }>

  /**
   * Run a callback with per-request locale isolation.
   *
   * Uses `AsyncLocalStorage` to scope locale and instance to the callback,
   * preventing cross-request locale leakage in concurrent SSR environments.
   *
   * @example
   * ```ts
   * // In your server middleware
   * app.use(async (req, res, next) => {
   *   const locale = detectLocale({ headers: req.headers, available: ['en', 'de'], fallback: 'en' })
   *   await withLocale(locale, () => next())
   * })
   * ```
   */
  withLocale: <T>(locale: string, fn: () => T | Promise<T>) => Promise<T>
}

/** Per-request store shape */
interface RequestStore {
  locale: string | null
  instance: (FluentiCoreInstanceFull & { locale: string }) | null
}

/**
 * Create server-side i18n utilities for Vue SSR / Nuxt.
 *
 * Uses `AsyncLocalStorage` for per-request isolation of locale state.
 * Wrap each request in `withLocale(locale, fn)` for safe concurrent SSR,
 * or use `setLocale()` / `getI18n()` directly if concurrency is not a concern.
 *
 * @example
 * ```ts
 * // server/i18n.ts
 * import { createServerI18n } from '@fluenti/vue/server'
 *
 * export const { setLocale, getI18n, withLocale } = createServerI18n({
 *   loadMessages: (locale) => import(`../locales/compiled/${locale}.ts`),
 *   fallbackLocale: 'en',
 * })
 * ```
 *
 * @example Per-request isolation (recommended for concurrent SSR):
 * ```ts
 * // server/middleware/i18n.ts
 * import { withLocale } from './i18n'
 *
 * export default defineEventHandler(async (event) => {
 *   const locale = detectLocaleFromEvent(event)
 *   return withLocale(locale, () => handleRequest(event))
 * })
 * ```
 */
export function createServerI18n(config: ServerI18nConfig): ServerI18n {
  const als = new AsyncLocalStorage<RequestStore>()

  // Module-level message cache — safe to share across requests (keyed by locale)
  const messageCache = new Map<string, Messages>()

  // Module-level fallback store for when ALS context is not active
  let fallbackStore: RequestStore = { locale: null, instance: null }

  function getStore(): RequestStore {
    return als.getStore() ?? fallbackStore
  }

  function setLocale(locale: string): void {
    const store = getStore()
    store.locale = locale
    store.instance = null
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

  async function buildInstance(locale: string): Promise<FluentiCoreInstanceFull & { locale: string }> {
    const allMessages: Record<string, Messages> = {}
    allMessages[locale] = await loadLocaleMessages(locale)

    if (config.fallbackLocale && config.fallbackLocale !== locale) {
      allMessages[config.fallbackLocale] = await loadLocaleMessages(config.fallbackLocale)
    }

    const fluentConfig: FluentiCoreConfigFull = {
      locale,
      messages: allMessages,
    }
    if (config.fallbackLocale !== undefined) fluentConfig.fallbackLocale = config.fallbackLocale
    if (config.fallbackChain !== undefined) fluentConfig.fallbackChain = config.fallbackChain
    if (config.dateFormats !== undefined) fluentConfig.dateFormats = config.dateFormats
    if (config.numberFormats !== undefined) fluentConfig.numberFormats = config.numberFormats
    if (config.missing !== undefined) fluentConfig.missing = config.missing

    return createFluentiCore(fluentConfig)
  }

  async function getI18n(): Promise<FluentiCoreInstanceFull & { locale: string }> {
    const store = getStore()

    // If setLocale() was never called, try the resolveLocale fallback.
    if (!store.locale && config.resolveLocale) {
      store.locale = await config.resolveLocale()
    }

    const locale = store.locale

    if (!locale) {
      throw new Error(
        '[fluenti] No locale set. Call setLocale(locale) in your server plugin or middleware before using getI18n(), ' +
          'or provide a resolveLocale function in createServerI18n config to auto-detect locale ' +
          'in server functions and other contexts where the layout does not run.',
      )
    }

    // Return cached instance if locale hasn't changed
    if (store.instance && store.instance.locale === locale) {
      return store.instance
    }

    store.instance = await buildInstance(locale)
    return store.instance
  }

  async function withLocale<T>(locale: string, fn: () => T | Promise<T>): Promise<T> {
    const store: RequestStore = { locale, instance: null }
    return als.run(store, async () => {
      return fn()
    })
  }

  return { setLocale, getI18n, withLocale }
}
