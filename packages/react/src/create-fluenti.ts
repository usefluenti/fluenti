import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { createFluentiCore } from '@fluenti/core'
import type {
  FluentiCoreInstanceFull as FluentInstanceExtended,
  CompiledMessage,
  Locale,
  Messages,
  AllMessages,
  DateFormatOptions,
  NumberFormatOptions,
  LocalizedString,
  MessageDescriptor,
} from '@fluenti/core'

/**
 * Configuration for `createFluenti()`.
 */
export interface FluentiConfig {
  /** Active locale code */
  locale: string
  /** Static message catalogs keyed by locale */
  messages?: AllMessages | undefined
  /** Async loader for lazy-loading locale messages */
  loadMessages?: ((locale: string) => Promise<Messages | { default: Messages }>) | undefined
  /** Fallback locale when a translation is missing */
  fallbackLocale?: string | undefined
  /** Custom fallback chains per locale */
  fallbackChain?: Record<string, string[]> | undefined
  /** Date format styles */
  dateFormats?: DateFormatOptions | undefined
  /** Number format styles */
  numberFormats?: NumberFormatOptions | undefined
  /** Missing message handler */
  missing?: ((locale: Locale, id: string) => string | undefined) | undefined
  /** Runtime diagnostics (pre-created instance or config) */
  diagnostics?: unknown | undefined
  /** Custom interpolation function for full ICU support at runtime */
  interpolate?: ((message: string, values: Record<string, unknown> | undefined, locale: string, formatters?: Record<string, unknown>) => string) | undefined
}

/**
 * The object returned by `createFluenti()`.
 *
 * Contains all i18n state and methods. Pass to `<I18nProvider instance={...}>`
 * or use directly in tests/non-React contexts.
 */
export interface FluentiInstance {
  /** Translate a message by id with optional interpolation values */
  t: {
    (id: string | MessageDescriptor, values?: Record<string, unknown>): LocalizedString
    (strings: TemplateStringsArray, ...exprs: unknown[]): LocalizedString
  }
  /** Format a date value for the current locale */
  d: (value: Date | number, style?: string) => LocalizedString
  /** Format a number value for the current locale */
  n: (value: number, style?: string) => LocalizedString
  /** Current locale */
  locale: string
  /** Change the active locale (async when lazy loading) */
  setLocale: (locale: string) => Promise<void>
  /** Whether a locale is currently being loaded */
  isLoading: boolean
  /** Preload a locale in the background without switching to it */
  preloadLocale: (locale: string) => Promise<void>
  /** Check whether a translation key exists for the given or current locale */
  te: (key: string, locale?: string) => boolean
  /** Get the raw compiled message for a key without interpolation */
  tm: (key: string, locale?: string) => CompiledMessage | undefined
  /** The underlying Fluent instance (escape hatch for advanced use) */
  i18n: FluentInstanceExtended
  /** Format an ICU message string directly (no catalog lookup) */
  format: (message: string, values?: Record<string, unknown>) => LocalizedString
  /** Merge additional messages into a locale catalog at runtime */
  loadMessages: (locale: string, messages: Messages) => void
  /** Return all locale codes that have loaded messages */
  getLocales: () => string[]
  /** Set of locales whose messages have been loaded */
  loadedLocales: string[]
}

function unwrapMessages(allMessages: Record<string, unknown>): Record<string, Messages> {
  const result: Record<string, Messages> = {}
  for (const [locale, msgs] of Object.entries(allMessages)) {
    result[locale] = typeof msgs === 'object' && msgs !== null && 'default' in msgs
      ? (msgs as { default: Messages }).default
      : msgs as Messages
  }
  return result
}

/**
 * Create a standalone Fluenti i18n instance.
 *
 * This is a React hook that manages locale state, message loading, and
 * provides all i18n methods. The returned instance can be passed to
 * `<I18nProvider instance={...}>` to share it with the component tree.
 *
 * @example
 * ```tsx
 * function App() {
 *   const i18n = createFluenti({
 *     locale: 'en',
 *     messages: { en: enMessages, fr: frMessages },
 *   })
 *   return (
 *     <I18nProvider instance={i18n}>
 *       <MyApp />
 *     </I18nProvider>
 *   )
 * }
 * ```
 */
export function createFluenti(config: FluentiConfig): FluentiInstance {
  const {
    locale: initialLocale,
    messages: initialMessages,
    loadMessages: loadMessagesFn,
    fallbackLocale,
    fallbackChain,
    dateFormats,
    numberFormats,
    missing,
    diagnostics,
    interpolate,
  } = config

  const [currentLocale, setCurrentLocale] = useState(initialLocale)
  const [isLoading, setIsLoading] = useState(false)
  const [loadedMessages, setLoadedMessages] = useState<Record<string, Messages>>(
    initialMessages ? unwrapMessages(initialMessages) : {},
  )
  const [loadedLocales, setLoadedLocales] = useState<string[]>(
    initialMessages ? Object.keys(initialMessages) : [],
  )

  const loadedMessagesRef = useRef(loadedMessages)
  loadedMessagesRef.current = loadedMessages

  const localeRequestRef = useRef(0)

  // Split runtime integration (for Vite plugin code splitting)
  const SPLIT_RUNTIME_KEY = Symbol.for('fluenti.runtime.react.v1')
  function getSplitRuntime(): { __switchLocale?: (l: string) => Promise<void>; __preloadLocale?: (l: string) => Promise<void> } | null {
    const rt = (globalThis as Record<PropertyKey, unknown>)[SPLIT_RUNTIME_KEY]
    return typeof rt === 'object' && rt !== null ? rt as any : null
  }

  const i18n = useMemo(() => {
    const cfg: Parameters<typeof createFluentiCore>[0] = {
      locale: currentLocale,
      messages: loadedMessages,
    }
    if (fallbackLocale !== undefined) cfg.fallbackLocale = fallbackLocale
    if (fallbackChain !== undefined) cfg.fallbackChain = fallbackChain
    if (dateFormats !== undefined) cfg.dateFormats = dateFormats
    if (numberFormats !== undefined) cfg.numberFormats = numberFormats
    if (missing !== undefined) cfg.missing = missing
    if (diagnostics !== undefined) cfg.diagnostics = diagnostics as Parameters<typeof createFluentiCore>[0]['diagnostics']
    if (interpolate !== undefined) cfg.interpolate = interpolate
    return createFluentiCore(cfg)
  }, [currentLocale, loadedMessages, fallbackLocale, fallbackChain, dateFormats, numberFormats, missing, diagnostics, interpolate])

  // Sync external locale changes
  useEffect(() => {
    if (initialLocale !== currentLocale) {
      void handleSetLocale(initialLocale)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocale])

  const handleSetLocale = useCallback(
    async (newLocale: string) => {
      const requestId = ++localeRequestRef.current

      const splitRuntime = loadMessagesFn ? getSplitRuntime() : null

      if (loadedMessagesRef.current[newLocale] && !loadMessagesFn) {
        setCurrentLocale(newLocale)
        return
      }

      if (loadedMessagesRef.current[newLocale]) {
        if (splitRuntime?.__switchLocale) {
          await splitRuntime.__switchLocale(newLocale)
        }
        setCurrentLocale(newLocale)
        return
      }

      if (!loadMessagesFn) {
        console.warn(
          `[fluenti] No messages for locale "${newLocale}" and no loadMessages function provided`,
        )
        return
      }

      setIsLoading(true)
      try {
        const msgs = await loadMessagesFn(newLocale)
        if (requestId !== localeRequestRef.current) return

        const resolved: Messages =
          typeof msgs === 'object' && msgs !== null && 'default' in msgs
            ? (msgs as { default: Messages }).default
            : (msgs as Messages)
        if (splitRuntime?.__switchLocale) {
          await splitRuntime.__switchLocale(newLocale)
        }
        if (requestId !== localeRequestRef.current) return
        setLoadedMessages((prev) => ({ ...prev, [newLocale]: resolved }))
        setLoadedLocales((prev) => [...new Set([...prev, newLocale])])
        setCurrentLocale(newLocale)
      } catch (err) {
        if (requestId === localeRequestRef.current) {
          console.error(`[fluenti] Failed to load locale "${newLocale}"`, err)
        }
      } finally {
        if (requestId === localeRequestRef.current) {
          setIsLoading(false)
        }
      }
    },
    [loadMessagesFn],
  )

  const preloadLocale = useCallback(
    async (loc: string) => {
      if (loadedMessagesRef.current[loc] || !loadMessagesFn) return
      try {
        const msgs = await loadMessagesFn(loc)
        const resolved: Messages =
          typeof msgs === 'object' && msgs !== null && 'default' in msgs
            ? (msgs as { default: Messages }).default
            : (msgs as Messages)
        setLoadedMessages((prev) => ({ ...prev, [loc]: resolved }))
        setLoadedLocales((prev) => [...new Set([...prev, loc])])
        const splitRuntime = getSplitRuntime()
        if (splitRuntime?.__preloadLocale) {
          await splitRuntime.__preloadLocale(loc)
        }
      } catch {
        // Silent fail for preload
      }
    },
    [loadMessagesFn],
  )

  const te = useCallback(
    (key: string, loc?: string): boolean => {
      const msgs = loadedMessages[loc ?? currentLocale]
      return msgs !== undefined && key in msgs
    },
    [loadedMessages, currentLocale],
  )

  const tm = useCallback(
    (key: string, loc?: string): Messages[string] | undefined => {
      const msgs = loadedMessages[loc ?? currentLocale]
      if (!msgs) return undefined
      return msgs[key]
    },
    [loadedMessages, currentLocale],
  )

  return useMemo(
    () => ({
      t: i18n.t.bind(i18n),
      d: i18n.d.bind(i18n),
      n: i18n.n.bind(i18n),
      locale: currentLocale,
      setLocale: handleSetLocale,
      isLoading,
      preloadLocale,
      te,
      tm,
      i18n,
      format: i18n.format.bind(i18n),
      loadMessages: i18n.loadMessages.bind(i18n),
      getLocales: i18n.getLocales.bind(i18n),
      loadedLocales,
    }),
    [i18n, currentLocale, handleSetLocale, isLoading, preloadLocale, te, tm, loadedLocales],
  )
}
