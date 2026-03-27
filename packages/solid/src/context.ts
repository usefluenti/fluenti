import { createSignal, type Accessor } from 'solid-js'
import { createFluentiCore } from '@fluenti/core'
import type { FluentiCoreConfig, FluentiCoreConfigFull, Locale, LocalizedString, Messages, CompiledMessage, MessageDescriptor, DateFormatOptions, NumberFormatOptions, DiagnosticsConfig, CustomFormatter } from '@fluenti/core'

/** Chunk loader for lazy locale loading */
export type ChunkLoader = (
  locale: string,
) => Promise<Record<string, CompiledMessage> | { default: Record<string, CompiledMessage> }>

interface SplitRuntimeModule {
  __switchLocale?: (locale: string) => Promise<void>
  __preloadLocale?: (locale: string) => Promise<void>
}

const SPLIT_RUNTIME_KEY = Symbol.for('fluenti.runtime.solid.v1')

function getSplitRuntimeModule(): SplitRuntimeModule | null {
  const runtime = (globalThis as Record<PropertyKey, unknown>)[SPLIT_RUNTIME_KEY]
  return typeof runtime === 'object' && runtime !== null
    ? runtime as SplitRuntimeModule
    : null
}

function resolveChunkMessages(
  loaded: Record<string, CompiledMessage> | { default: Record<string, CompiledMessage> },
): Record<string, CompiledMessage> {
  return typeof loaded === 'object' && loaded !== null && 'default' in loaded
    ? (loaded as { default: Record<string, CompiledMessage> }).default
    : loaded
}

/** @internal Map locale → default currency code */
const LOCALE_CURRENCY_MAP: Record<string, string> = {
  'en': 'USD', 'en-US': 'USD', 'en-GB': 'GBP', 'en-AU': 'AUD', 'en-CA': 'CAD',
  'zh-CN': 'CNY', 'zh-TW': 'TWD', 'zh-HK': 'HKD',
  'ja': 'JPY', 'ja-JP': 'JPY',
  'ko': 'KRW', 'ko-KR': 'KRW',
  'de': 'EUR', 'de-DE': 'EUR', 'de-AT': 'EUR',
  'fr': 'EUR', 'fr-FR': 'EUR', 'fr-CA': 'CAD',
  'es': 'EUR', 'es-ES': 'EUR', 'es-MX': 'MXN',
  'pt': 'EUR', 'pt-BR': 'BRL', 'pt-PT': 'EUR',
  'it': 'EUR', 'ru': 'RUB', 'ar': 'SAR', 'hi': 'INR',
}

/** @internal Built-in date format styles (merged under user-provided dateFormats) */
const DEFAULT_DATE_FORMATS: Record<string, Intl.DateTimeFormatOptions> = {
  short: { year: 'numeric', month: 'numeric', day: 'numeric' },
  long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
  time: { hour: 'numeric', minute: 'numeric' },
  datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' },
}

/** @internal Built-in number format styles (merged under user-provided numberFormats) */
const DEFAULT_NUMBER_FORMATS: Record<string, Intl.NumberFormatOptions | ((locale: Locale) => Intl.NumberFormatOptions)> = {
  currency: (locale: string) => ({
    style: 'currency',
    currency: LOCALE_CURRENCY_MAP[locale] ?? LOCALE_CURRENCY_MAP[locale.split('-')[0]!] ?? 'USD',
  }),
  percent: { style: 'percent' },
  decimal: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
}

/** Extended config with lazy locale loading support */
export interface FluentiConfig extends FluentiCoreConfig {
  /** Async chunk loader for lazy locale loading */
  chunkLoader?: ChunkLoader
  /** Enable lazy locale loading through chunkLoader */
  lazyLocaleLoading?: boolean
  /** Locale-specific fallback chains */
  fallbackChain?: Record<string, Locale[]>
  /** Named date format styles */
  dateFormats?: DateFormatOptions
  /** Named number format styles */
  numberFormats?: NumberFormatOptions
  /** Runtime diagnostics configuration */
  diagnostics?: DiagnosticsConfig
  /**
   * Custom message interpolation function.
   *
   * By default, the runtime uses a lightweight `{key}` replacer.
   * Pass the full `interpolate` from `@fluenti/core/internal` for
   * runtime ICU MessageFormat support (plurals, selects, nested arguments).
   */
  interpolate?: (
    message: string,
    values: Record<string, unknown> | undefined,
    locale: string,
    formatters?: Record<string, CustomFormatter>,
  ) => string
}

/** Reactive i18n context holding locale signal and translation utilities */
export interface FluentiContext {
  /** Reactive accessor for the current locale */
  locale(): Locale
  /** Set the active locale (async when lazy locale loading is enabled) */
  setLocale(locale: Locale): Promise<void>
  /** Translate a message by id with optional interpolation values */
  t(id: string | MessageDescriptor, values?: Record<string, unknown>): LocalizedString
  /** Tagged template form: t`Hello ${name}` */
  t(strings: TemplateStringsArray, ...exprs: unknown[]): LocalizedString
  /** Merge additional messages into a locale catalog at runtime */
  loadMessages(locale: Locale, messages: Messages): void
  /** Return all locale codes that have loaded messages */
  getLocales(): Locale[]
  /** Format a date value for the current locale */
  d(value: Date | number, style?: string): LocalizedString
  /** Format a number value for the current locale */
  n(value: number, style?: string): LocalizedString
  /** Format an ICU message string directly (no catalog lookup) */
  format(message: string, values?: Record<string, unknown>): LocalizedString
  /** Whether a locale chunk is currently being loaded */
  isLoading: Accessor<boolean>
  /** Set of locales whose messages have been loaded */
  loadedLocales: Accessor<Set<string>>
  /** Preload a locale in the background without switching to it */
  preloadLocale(locale: string): void
  /** Check if a translation key exists for the given or current locale */
  te(key: string, loc?: string): boolean
  /** Get the raw compiled message for a key without interpolation */
  tm(key: string, loc?: string): CompiledMessage | undefined
}

/**
 * Create a reactive i18n context backed by Solid signals.
 *
 * The returned `t()` reads the internal `locale()` signal, so any
 * Solid computation that calls `t()` will re-run when the locale changes.
 *
 * @example
 * ```tsx
 * import { createFluentiContext } from '@fluenti/solid'
 * import messages from './locales/compiled/en.js'
 *
 * const ctx = createFluentiContext({
 *   locale: 'en',
 *   messages: { en: messages },
 * })
 *
 * // Use t`` tagged template (preferred)
 * const greeting = ctx.t`Hello, {name}!`
 * ```
 */
export function createFluentiContext(config: FluentiCoreConfig | FluentiConfig): FluentiContext {
  const [locale, setLocaleSignal] = createSignal<Locale>(config.locale)
  const [isLoading, setIsLoading] = createSignal(false)
  const loadedLocalesSet = new Set<string>([config.locale])
  const [loadedLocales, setLoadedLocales] = createSignal(new Set(loadedLocalesSet))
  const messages: Record<string, Messages> = { ...config.messages }
  const i18nConfig = config as FluentiConfig
  const lazyLocaleLoading = i18nConfig.lazyLocaleLoading
    ?? (config as FluentiConfig & { splitting?: boolean }).splitting
    ?? false

  // Create a core instance that handles all translation, lookup, fallback, and formatting logic.
  // Merge built-in date/number format styles under user-provided overrides.
  const i18n = createFluentiCore({
    locale: config.locale,
    messages: config.messages ?? {},
    fallbackLocale: config.fallbackLocale,
    fallbackChain: i18nConfig.fallbackChain,
    dateFormats: { ...DEFAULT_DATE_FORMATS, ...i18nConfig.dateFormats },
    numberFormats: { ...DEFAULT_NUMBER_FORMATS, ...i18nConfig.numberFormats },
    missing: config.missing,
    diagnostics: i18nConfig.diagnostics as FluentiCoreConfigFull['diagnostics'],
    interpolate: i18nConfig.interpolate,
  })

  function t(strings: TemplateStringsArray, ...exprs: unknown[]): LocalizedString
  function t(id: string | MessageDescriptor, values?: Record<string, unknown>): LocalizedString
  function t(idOrStrings: string | MessageDescriptor | TemplateStringsArray, ...rest: unknown[]): LocalizedString {
    const current = locale() // READ SIGNAL → reactive dependency for Solid re-renders
    if (i18n.locale !== current) i18n.locale = current
    return i18n.t(idOrStrings as string, ...rest) as LocalizedString
  }

  const loadMessages = (loc: Locale, msgs: Messages): void => {
    i18n.loadMessages(loc, msgs)
    // Keep local messages in sync for te/tm which check the local object
    // Intentional mutation: messages record is locally scoped to this context closure
    messages[loc] = { ...messages[loc], ...msgs }
    loadedLocalesSet.add(loc)
    setLoadedLocales(new Set(loadedLocalesSet))
  }

  let _localeRequestId = 0

  const setLocale = async (newLocale: Locale): Promise<void> => {
    if (!lazyLocaleLoading || !i18nConfig.chunkLoader) {
      setLocaleSignal(newLocale)
      return
    }

    const splitRuntime = getSplitRuntimeModule()

    if (loadedLocalesSet.has(newLocale)) {
      if (splitRuntime?.__switchLocale) {
        await splitRuntime.__switchLocale(newLocale)
      }
      setLocaleSignal(newLocale)
      return
    }

    // Race-condition protection: track request ID
    const thisRequest = ++_localeRequestId
    setIsLoading(true)
    try {
      const loaded = resolveChunkMessages(await i18nConfig.chunkLoader(newLocale))
      // Always store loaded messages — they may be needed if locale is switched back
      i18n.loadMessages(newLocale, loaded)
      // Intentional mutation: messages record is locally scoped to this context closure
      messages[newLocale] = { ...messages[newLocale], ...loaded }
      loadedLocalesSet.add(newLocale)
      setLoadedLocales(new Set(loadedLocalesSet))
      // Stale request — a newer setLocale call superseded this one; don't switch locale
      if (thisRequest !== _localeRequestId) return
      if (splitRuntime?.__switchLocale) {
        await splitRuntime.__switchLocale(newLocale)
      }
      // Re-check after async __switchLocale — a newer setLocale() may have superseded this one
      if (thisRequest !== _localeRequestId) return
      setLocaleSignal(newLocale)
    } finally {
      if (thisRequest === _localeRequestId) {
        setIsLoading(false)
      }
    }
  }

  const _preloadInFlight = new Set<string>()

  const preloadLocale = (loc: string): void => {
    if (!lazyLocaleLoading || loadedLocalesSet.has(loc) || !i18nConfig.chunkLoader || _preloadInFlight.has(loc)) return
    _preloadInFlight.add(loc)
    const splitRuntime = getSplitRuntimeModule()
    i18nConfig.chunkLoader(loc).then(async (loaded) => {
      const resolved = resolveChunkMessages(loaded)
      i18n.loadMessages(loc, resolved)
      // Intentional mutation: messages record is locally scoped to this context closure
      messages[loc] = { ...messages[loc], ...resolved }
      loadedLocalesSet.add(loc)
      setLoadedLocales(new Set(loadedLocalesSet))
      if (splitRuntime?.__preloadLocale) {
        await splitRuntime.__preloadLocale(loc)
      }
    }).catch((e: unknown) => {
      console.warn('[fluenti] preload failed:', loc, e)
    }).finally(() => {
      _preloadInFlight.delete(loc)
    })
  }

  const getLocales = (): Locale[] => i18n.getLocales()

  const d = (value: Date | number, style?: string): LocalizedString => {
    const current = locale() // READ SIGNAL → reactive dependency
    if (i18n.locale !== current) i18n.locale = current
    return i18n.d(value, style) as LocalizedString
  }

  const n = (value: number, style?: string): LocalizedString => {
    const current = locale() // READ SIGNAL → reactive dependency
    if (i18n.locale !== current) i18n.locale = current
    return i18n.n(value, style) as LocalizedString
  }

  const format = (message: string, values?: Record<string, unknown>): LocalizedString => {
    const current = locale() // READ SIGNAL → reactive dependency
    if (i18n.locale !== current) i18n.locale = current
    return i18n.format(message, values) as LocalizedString
  }

  const te = (key: string, loc?: string): boolean => {
    const msgs = messages[loc ?? locale()]
    return msgs !== undefined && key in msgs
  }

  const tm = (key: string, loc?: string): CompiledMessage | undefined => {
    const msgs = messages[loc ?? locale()]
    return msgs ? msgs[key] : undefined
  }

  return { locale, setLocale, t, loadMessages, getLocales, d, n, format, isLoading, loadedLocales, preloadLocale, te, tm }
}
