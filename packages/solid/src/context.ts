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
const GLOBAL_FLUENTI_CONTEXT_KEY = Symbol.for('fluenti.solid.context.v1')
const DEVELOPMENT_FALLBACK_CONTEXT_KEY = Symbol.for('fluenti.solid.fallback-context.v1')

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

function isDevelopmentMode(): boolean {
  try {
    if (typeof process !== 'undefined' && process.env != null && process.env['NODE_ENV'] === 'production') {
      return false
    }
  } catch {
    // process not available
  }
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env != null) {
      return !!(import.meta as { env?: { DEV?: boolean } }).env?.DEV
    }
  } catch {
    // import.meta not available
  }
  try {
    if (typeof process !== 'undefined' && process.env != null) {
      return process.env['NODE_ENV'] !== 'production'
    }
  } catch {
    // process not available
  }
  return false
}

function getStoredContext(key: symbol): FluentiContext | undefined {
  const value = (globalThis as Record<PropertyKey, unknown>)[key]
  return value && typeof value === 'object' ? value as FluentiContext : undefined
}

function setStoredContext(key: symbol, context: FluentiContext): FluentiContext {
  ;(globalThis as Record<PropertyKey, unknown>)[key] = context
  return context
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
   * Pass the full `interpolate` from `@fluenti/core/runtime` for
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

function createDevelopmentFallbackContext(): FluentiContext {
  let currentLocale: Locale = 'en'
  const loadedMessages: Record<string, Messages> = { en: {} }
  const core = createFluentiCore({
    locale: currentLocale,
    messages: loadedMessages,
    devWarnings: false,
  })

  const locale = (): Locale => currentLocale
  const isLoading = (): boolean => false
  const loadedLocales = (): Set<string> => new Set(Object.keys(loadedMessages))

  function syncLocale(): void {
    if (core.locale !== currentLocale) {
      core.locale = currentLocale
    }
  }

  function t(strings: TemplateStringsArray, ...exprs: unknown[]): LocalizedString
  function t(id: string | MessageDescriptor, values?: Record<string, unknown>): LocalizedString
  function t(idOrStrings: string | MessageDescriptor | TemplateStringsArray, ...rest: unknown[]): LocalizedString {
    syncLocale()
    if (Array.isArray(idOrStrings) && 'raw' in idOrStrings) {
      return core.t(idOrStrings as TemplateStringsArray, ...rest) as LocalizedString
    }
    return core.t(
      idOrStrings as string | MessageDescriptor,
      rest[0] as Record<string, unknown> | undefined,
    ) as LocalizedString
  }

  const setLocale = async (newLocale: Locale): Promise<void> => {
    currentLocale = newLocale
    core.locale = newLocale
    loadedMessages[newLocale] ??= {}
  }

  const loadMessages = (loc: Locale, msgs: Messages): void => {
    core.loadMessages(loc, msgs)
    loadedMessages[loc] = { ...loadedMessages[loc], ...msgs }
  }

  const getLocales = (): Locale[] => Array.from(new Set([...core.getLocales(), ...Object.keys(loadedMessages)]))

  const d = (value: Date | number, style?: string): LocalizedString => {
    syncLocale()
    return core.d(value, style) as LocalizedString
  }

  const n = (value: number, style?: string): LocalizedString => {
    syncLocale()
    return core.n(value, style) as LocalizedString
  }

  const format = (message: string, values?: Record<string, unknown>): LocalizedString => {
    syncLocale()
    return core.format(message, values) as LocalizedString
  }

  const preloadLocale = (_locale: string): void => {}

  const te = (key: string, loc?: string): boolean => {
    const messages = loadedMessages[loc ?? currentLocale]
    return messages !== undefined && key in messages
  }

  const tm = (key: string, loc?: string): CompiledMessage | undefined => {
    const messages = loadedMessages[loc ?? currentLocale]
    return messages ? messages[key] : undefined
  }

  return {
    locale,
    setLocale,
    t,
    loadMessages,
    getLocales,
    d,
    n,
    format,
    isLoading,
    loadedLocales,
    preloadLocale,
    te,
    tm,
  }
}

export type FluentiContextFallbackSource = 'singleton' | 'development'

export function resolveFluentiFallbackContext():
  | { context: FluentiContext; source: FluentiContextFallbackSource }
  | undefined {
  const globalContext = getStoredContext(GLOBAL_FLUENTI_CONTEXT_KEY)
  if (globalContext) {
    return { context: globalContext, source: 'singleton' }
  }

  if (!isDevelopmentMode()) {
    return undefined
  }

  let fallbackContext = getStoredContext(DEVELOPMENT_FALLBACK_CONTEXT_KEY)
  if (!fallbackContext) {
    fallbackContext = setStoredContext(
      DEVELOPMENT_FALLBACK_CONTEXT_KEY,
      createDevelopmentFallbackContext(),
    )
  }
  return { context: fallbackContext, source: 'development' }
}

/**
 * Create a reactive i18n context backed by Solid signals.
 *
 * The returned `t()` reads the internal `locale()` signal, so any
 * Solid computation that calls `t()` will re-run when the locale changes.
 *
 * @example
 * ```tsx
 * import { createFluenti } from '@fluenti/solid'
 * import messages from './locales/compiled/en.js'
 *
 * const ctx = createFluenti({
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
  // Build config incrementally to satisfy exactOptionalPropertyTypes —
  // optional properties must not receive `undefined` as a value.
  const coreConfig: FluentiCoreConfigFull = {
    locale: config.locale,
    messages: config.messages ?? {},
    dateFormats: { ...DEFAULT_DATE_FORMATS, ...i18nConfig.dateFormats },
    numberFormats: { ...DEFAULT_NUMBER_FORMATS, ...i18nConfig.numberFormats },
  }
  if (config.fallbackLocale !== undefined) coreConfig.fallbackLocale = config.fallbackLocale
  if (i18nConfig.fallbackChain !== undefined) coreConfig.fallbackChain = i18nConfig.fallbackChain
  if (config.missing !== undefined) coreConfig.missing = config.missing
  if (i18nConfig.diagnostics !== undefined) coreConfig.diagnostics = i18nConfig.diagnostics as FluentiCoreConfigFull['diagnostics']
  if (i18nConfig.interpolate !== undefined) coreConfig.interpolate = i18nConfig.interpolate
  coreConfig.devWarnings = coreConfig.devWarnings ?? (typeof process !== 'undefined' && process.env?.['NODE_ENV'] === 'development')
  const i18n = createFluentiCore(coreConfig)

  function t(strings: TemplateStringsArray, ...exprs: unknown[]): LocalizedString
  function t(id: string | MessageDescriptor, values?: Record<string, unknown>): LocalizedString
  function t(idOrStrings: string | MessageDescriptor | TemplateStringsArray, ...rest: unknown[]): LocalizedString {
    const current = locale() // READ SIGNAL → reactive dependency for Solid re-renders
    if (i18n.locale !== current) i18n.locale = current
    // Dispatch to the correct overload based on input type
    if (Array.isArray(idOrStrings) && 'raw' in idOrStrings) {
      return i18n.t(idOrStrings as TemplateStringsArray, ...rest) as LocalizedString
    }
    return i18n.t(idOrStrings as string | MessageDescriptor, rest[0] as Record<string, unknown> | undefined) as LocalizedString
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
      try {
        if (splitRuntime?.__switchLocale) {
          await splitRuntime.__switchLocale(newLocale)
        }
      } catch (e) {
        console.warn(`[fluenti] split runtime switch failed for locale "${newLocale}"`, e)
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
      try {
        if (splitRuntime?.__switchLocale) {
          await splitRuntime.__switchLocale(newLocale)
        }
      } catch (e) {
        console.warn(`[fluenti] split runtime switch failed for locale "${newLocale}"`, e)
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

export function createFluenti(config: FluentiCoreConfig | FluentiConfig): FluentiContext {
  return setStoredContext(GLOBAL_FLUENTI_CONTEXT_KEY, createFluentiContext(config))
}

export function __resetFluentiGlobalStateForTests(): void {
  delete (globalThis as Record<PropertyKey, unknown>)[GLOBAL_FLUENTI_CONTEXT_KEY]
  delete (globalThis as Record<PropertyKey, unknown>)[DEVELOPMENT_FALLBACK_CONTEXT_KEY]
}
