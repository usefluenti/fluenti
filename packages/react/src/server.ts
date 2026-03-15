import { cache } from 'react'
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
   * This is the fallback for contexts where the layout doesn't run — most
   * notably **Server Actions** (`'use server'`), which are independent
   * requests that skip the layout tree entirely.
   *
   * Common patterns:
   * - Read from a cookie (Next.js: `cookies().get('locale')`)
   * - Read from a request header set by middleware
   * - Query the database for the authenticated user's preference
   *
   * If omitted and `setLocale()` was not called, `getI18n()` will throw.
   *
   * @example
   * ```ts
   * resolveLocale: async () => {
   *   const { cookies } = await import('next/headers')
   *   return (await cookies()).get('locale')?.value ?? 'en'
   * }
   * ```
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
   * Call this once in your root layout or page before any `getI18n()` calls.
   *
   * Uses `React.cache()` — scoped to the current request automatically.
   */
  setLocale: (locale: string) => void

  /**
   * Get a fully configured i18n instance for the current request.
   * Messages are loaded lazily and cached per-request.
   *
   * @example
   * ```tsx
   * // In any Server Component
   * const { t, d, n, locale } = await getI18n()
   * return <h1>{t('welcome')}</h1>
   * ```
   */
  getI18n: () => Promise<FluentInstanceExtended & { locale: string }>
}

/**
 * Create server-side i18n utilities for React Server Components.
 *
 * Uses `React.cache()` to share state within a single server request
 * without React Context (which is unavailable in Server Components).
 *
 * @example
 * ```ts
 * // lib/i18n.server.ts — define once
 * import { createServerI18n } from '@fluenti/react/server'
 *
 * export const { setLocale, getI18n } = createServerI18n({
 *   loadMessages: (locale) => import(`../messages/${locale}.json`),
 *   fallbackLocale: 'en',
 * })
 * ```
 *
 * ```tsx
 * // app/[locale]/layout.tsx — set locale once
 * import { setLocale } from '@/lib/i18n.server'
 *
 * export default async function Layout({ params, children }) {
 *   const { locale } = await params
 *   setLocale(locale)
 *   return <html lang={locale}><body>{children}</body></html>
 * }
 * ```
 *
 * ```tsx
 * // app/[locale]/page.tsx — use anywhere
 * import { getI18n } from '@/lib/i18n.server'
 *
 * export default async function Page() {
 *   const { t, d, n } = await getI18n()
 *   return <h1>{t('welcome')}</h1>
 * }
 * ```
 */
export function createServerI18n(config: ServerI18nConfig): ServerI18n {
  // Request-scoped store using React.cache()
  // Each server request gets its own isolated state
  const getRequestStore = cache((): {
    locale: string | null
    instance: (FluentInstanceExtended & { locale: string }) | null
  } => ({
    locale: null,
    instance: null,
  }))

  // Cache loaded messages per-request to avoid redundant imports
  const getMessageCache = cache((): Map<string, Messages> => new Map())

  function setLocale(locale: string): void {
    getRequestStore().locale = locale
  }

  async function loadLocaleMessages(locale: string): Promise<Messages> {
    const messageCache = getMessageCache()
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
    const store = getRequestStore()

    // If setLocale() was never called (e.g. Server Action — independent request
    // that skips the layout), try the resolveLocale fallback.
    if (!store.locale && config.resolveLocale) {
      store.locale = await config.resolveLocale()
    }

    const locale = store.locale

    if (!locale) {
      throw new Error(
        '[fluenti] No locale set. Call setLocale(locale) in your layout before using getI18n(), ' +
          'or provide a resolveLocale function in createServerI18n config to auto-detect locale ' +
          'in Server Actions and other contexts where the layout does not run.',
      )
    }

    // Return cached instance if locale hasn't changed
    if (store.instance && store.instance.locale === locale) {
      return store.instance
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

    store.instance = createFluent(fluentConfig)
    return store.instance
  }

  return { setLocale, getI18n }
}
