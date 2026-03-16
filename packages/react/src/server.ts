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
import { createElement, Fragment, type ReactNode, type ReactElement } from 'react'
import { hashMessage, extractMessage, reconstruct } from './components/trans-core'
import { resolveCategory, replaceHash, type PluralCategory } from './components/plural-core'

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

// ─── Server Component Props ──────────────────────────────────────────────────

export interface ServerTransProps {
  /** Source text with embedded components */
  children: ReactNode
  /** Override auto-generated hash ID */
  id?: string
  /** Context comment for translators */
  comment?: string
  /** Custom render wrapper */
  render?: (translation: ReactNode) => ReactNode
}

export interface ServerPluralProps {
  /** The count value */
  value: number
  /** Text for zero (if language supports) */
  zero?: ReactNode
  /** Singular form. `#` replaced with value */
  one?: ReactNode
  /** Dual form (Arabic, etc.) */
  two?: ReactNode
  /** Few form (Slavic languages, etc.) */
  few?: ReactNode
  /** Many form */
  many?: ReactNode
  /** Default plural form */
  other: ReactNode
  /** Offset from value before selecting form */
  offset?: number
}

export interface ServerDateTimeProps {
  /** Date value to format */
  value: Date | number
  /** Named format style */
  style?: string
}

export interface ServerNumberProps {
  /** Number value to format */
  value: number
  /** Named format style */
  style?: string
}

// ─── Server Component Types ──────────────────────────────────────────────────

type ServerTransComponent = (props: ServerTransProps) => Promise<ReactElement>
type ServerPluralComponent = (props: ServerPluralProps) => Promise<ReactElement>
type ServerDateTimeComponent = (props: ServerDateTimeProps) => Promise<ReactElement>
type ServerNumberComponent = (props: ServerNumberProps) => Promise<ReactElement>

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

  /**
   * `<Trans>` for React Server Components.
   * Async component — automatically resolves the i18n instance.
   *
   * @example
   * ```tsx
   * <Trans>Read the <a href="/docs">documentation</a>.</Trans>
   * ```
   */
  Trans: ServerTransComponent

  /**
   * `<Plural>` for React Server Components.
   *
   * @example
   * ```tsx
   * <Plural value={count} one="# item" other="# items" />
   * ```
   */
  Plural: ServerPluralComponent

  /**
   * `<DateTime>` for React Server Components.
   *
   * @example
   * ```tsx
   * <DateTime value={new Date()} style="long" />
   * ```
   */
  DateTime: ServerDateTimeComponent

  /**
   * `<NumberFormat>` for React Server Components.
   *
   * @example
   * ```tsx
   * <NumberFormat value={1234.56} style="currency" />
   * ```
   */
  NumberFormat: ServerNumberComponent
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
 * export const { setLocale, getI18n, Trans, Plural, DateTime, NumberFormat } = createServerI18n({
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
 * // app/[locale]/page.tsx — use Trans, Plural, etc. directly
 * import { Trans, Plural } from '@/lib/i18n.server'
 *
 * export default async function Page() {
 *   return (
 *     <div>
 *       <Trans>Read the <a href="/docs">documentation</a>.</Trans>
 *       <Plural value={5} one="# item" other="# items" />
 *     </div>
 *   )
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

  // ─── Async Server Components ─────────────────────────────────────────────

  async function Trans({ children, id, render }: ServerTransProps): Promise<ReactElement> {
    const i18n = await getI18n()
    const { message, components } = extractMessage(children)
    const messageId = id ?? hashMessage(message)
    const translated = i18n.t({ id: messageId, message })
    const result = reconstruct(translated, components)
    return createElement(Fragment, null, render ? render(result) : result)
  }

  async function Plural({ value, zero, one, two, few, many, other, offset }: ServerPluralProps): Promise<ReactElement> {
    const i18n = await getI18n()
    const adjustedValue = offset ? value - offset : value

    const available: Record<string, boolean> = {
      zero: zero !== undefined,
      one: one !== undefined,
      two: two !== undefined,
      few: few !== undefined,
      many: many !== undefined,
      other: true,
    }

    const category = resolveCategory(adjustedValue, i18n.locale, available)

    const forms: Record<PluralCategory, ReactNode | undefined> = {
      zero,
      one,
      two,
      few,
      many,
      other,
    }

    const selected = forms[category] ?? other
    const formatted = i18n.n(value)

    return createElement(Fragment, null, replaceHash(selected, formatted))
  }

  async function DateTime({ value, style }: ServerDateTimeProps): Promise<ReactElement> {
    const i18n = await getI18n()
    return createElement(Fragment, null, i18n.d(value, style))
  }

  async function NumberFormat({ value, style }: ServerNumberProps): Promise<ReactElement> {
    const i18n = await getI18n()
    return createElement(Fragment, null, i18n.n(value, style))
  }

  return { setLocale, getI18n, Trans, Plural, DateTime, NumberFormat }
}
