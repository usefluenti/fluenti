import { createSignal, createRoot, type Accessor } from 'solid-js'
import { formatDate, formatNumber, interpolate as coreInterpolate, buildICUMessage, resolveDescriptorId } from '@fluenti/core'
import type { FluentiRuntimeConfig, Locale, LocalizedString, Messages, CompiledMessage, MessageDescriptor, MissingKeyEvent, DateFormatOptions, NumberFormatOptions, ChunkLoader, SplitRuntimeModule, DiagnosticsConfig } from '@fluenti/core'

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

/** Extended config with lazy locale loading support */
export interface I18nConfig extends FluentiRuntimeConfig {
  /**
   * Async message loader for lazy locale loading.
   * Preferred over `chunkLoader` (which is deprecated).
   */
  loadMessages?: ChunkLoader
  /**
   * Async chunk loader for lazy locale loading.
   * @deprecated Use `loadMessages` instead.
   */
  chunkLoader?: ChunkLoader
  /** Enable lazy locale loading through loadMessages/chunkLoader */
  lazyLocaleLoading?: boolean
  /** Locale-specific fallback chains */
  fallbackChain?: Record<string, Locale[]>
  /** Named date format styles */
  dateFormats?: DateFormatOptions
  /** Named number format styles */
  numberFormats?: NumberFormatOptions
  /** Runtime diagnostics configuration (forwarded to core) */
  diagnostics?: DiagnosticsConfig
  /**
   * Unified missing key handler. Called when a translation is missing or a fallback locale is used.
   * Returning a string uses it as the translation. Returning undefined/void uses default behavior.
   */
  onMissingKey?: (event: MissingKeyEvent) => string | undefined | void
}

/** Reactive i18n context holding locale signal and translation utilities */
export interface I18nContext {
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
  d(value: Date | number, style?: string, locale?: string): LocalizedString
  /** Format a number value for the current locale */
  n(value: number, style?: string, locale?: string): LocalizedString
  /** Format an ICU message string directly (no catalog lookup) */
  format(message: string, values?: Record<string, unknown>): LocalizedString
  /** Whether a locale chunk is currently being loaded */
  isLoading: Accessor<boolean>
  /** Set of locales whose messages have been loaded */
  loadedLocales: Accessor<ReadonlySet<string>>
  /** Preload a locale in the background without switching to it */
  preloadLocale(locale: string): Promise<void>
  /** Check if a translation key exists in the catalog */
  te(key: string, locale?: string): boolean
  /** Get the raw compiled message without interpolation */
  tm(key: string, locale?: string): CompiledMessage | undefined
}

/**
 * Create a reactive i18n context backed by Solid signals.
 *
 * The returned `t()` reads the internal `locale()` signal, so any
 * Solid computation that calls `t()` will re-run when the locale changes.
 */
export function createI18nContext(config: FluentiRuntimeConfig | I18nConfig): I18nContext {
  const [locale, setLocaleSignal] = createSignal<Locale>(config.locale)
  const [isLoading, setIsLoading] = createSignal(false)
  const loadedLocalesSet = new Set<string>([config.locale])
  const [loadedLocales, setLoadedLocales] = createSignal(new Set(loadedLocalesSet))
  const messages: Record<string, Messages> = { ...config.messages }
  const i18nConfig = config as I18nConfig
  const chunkLoaderFn = i18nConfig.loadMessages ?? i18nConfig.chunkLoader
  const lazyLocaleLoading = i18nConfig.lazyLocaleLoading
    ?? (config as I18nConfig & { splitting?: boolean }).splitting
    ?? false

  function lookupCatalog(
    id: string,
    loc: Locale,
    values?: Record<string, unknown>,
  ): LocalizedString | undefined {
    const catalog = messages[loc]
    if (!catalog) {
      return undefined
    }

    const msg = catalog[id]
    if (msg === undefined) {
      return undefined
    }

    if (typeof msg === 'function') {
      return msg(values) as LocalizedString
    }

    if (typeof msg === 'string' && values) {
      return coreInterpolate(msg, values, loc) as LocalizedString
    }

    return String(msg) as LocalizedString
  }

  interface LookupResult {
    text: LocalizedString
    resolvedLocale: Locale
  }

  function lookupWithFallbacks(
    id: string,
    loc: Locale,
    values?: Record<string, unknown>,
  ): LookupResult | undefined {
    const localesToTry: Locale[] = [loc]
    const seen = new Set(localesToTry)

    if (config.fallbackLocale && !seen.has(config.fallbackLocale)) {
      localesToTry.push(config.fallbackLocale)
      seen.add(config.fallbackLocale)
    }

    const chainLocales = i18nConfig.fallbackChain?.[loc] ?? i18nConfig.fallbackChain?.['*']
    if (chainLocales) {
      for (const chainLocale of chainLocales) {
        if (!seen.has(chainLocale)) {
          localesToTry.push(chainLocale)
          seen.add(chainLocale)
        }
      }
    }

    for (const targetLocale of localesToTry) {
      const result = lookupCatalog(id, targetLocale, values)
      if (result !== undefined) {
        return { text: result, resolvedLocale: targetLocale }
      }
    }

    return undefined
  }

  /** Fire `onMissingKey` and return a fallback string if provided. */
  function fireOnMissingKey(id: string, loc: Locale, fallbackUsed?: Locale): string | undefined {
    if (!i18nConfig.onMissingKey) return undefined
    try {
      const event: MissingKeyEvent = fallbackUsed !== undefined
        ? { locale: loc, id, fallbackUsed }
        : { locale: loc, id }
      const result = i18nConfig.onMissingKey(event)
      if (typeof result === 'string') return result
    } catch {
      // Handler threw — fall through
    }
    return undefined
  }

  function resolveMissing(
    id: string,
    loc: Locale,
  ): LocalizedString | undefined {
    // Legacy handler (deprecated)
    if (config.missing) {
      const result = config.missing(loc, id)
      if (result !== undefined) {
        return result as LocalizedString
      }
    }

    // Unified handler
    const onMissingResult = fireOnMissingKey(id, loc)
    if (onMissingResult !== undefined) {
      return onMissingResult as LocalizedString
    }

    return undefined
  }

  function resolveMessage(
    id: string,
    loc: Locale,
    values?: Record<string, unknown>,
  ): LocalizedString {
    const lookupResult = lookupWithFallbacks(id, loc, values)
    if (lookupResult !== undefined) {
      // If resolved from a fallback locale, fire onMissingKey with fallbackUsed
      if (lookupResult.resolvedLocale !== loc) {
        const override = fireOnMissingKey(id, loc, lookupResult.resolvedLocale)
        if (override !== undefined) {
          return override as LocalizedString
        }
      }
      return lookupResult.text
    }

    const missingResult = resolveMissing(id, loc)
    if (missingResult !== undefined) {
      return missingResult
    }

    if (id.includes('{')) {
      return coreInterpolate(id, values, loc) as LocalizedString
    }

    return id as LocalizedString
  }

  function t(strings: TemplateStringsArray, ...exprs: unknown[]): LocalizedString
  function t(id: string | MessageDescriptor, values?: Record<string, unknown>): LocalizedString
  function t(idOrStrings: string | MessageDescriptor | TemplateStringsArray, ...rest: unknown[]): LocalizedString {
    // Tagged template form: t`Hello ${name}`
    if (Array.isArray(idOrStrings) && 'raw' in idOrStrings) {
      const strings = idOrStrings as TemplateStringsArray
      const icu = buildICUMessage(strings, rest)
      const values = Object.fromEntries(rest.map((v, i) => [String(i), v]))
      return t(icu, values)
    }

    const id = idOrStrings as string | MessageDescriptor
    const values = rest[0] as Record<string, unknown> | undefined
    const currentLocale = locale() // reactive dependency
    if (typeof id === 'object' && id !== null) {
      const messageId = resolveDescriptorId(id)
      if (messageId) {
        const lookupResult = lookupWithFallbacks(messageId, currentLocale, values)
        if (lookupResult !== undefined) {
          if (lookupResult.resolvedLocale !== currentLocale) {
            const override = fireOnMissingKey(messageId, currentLocale, lookupResult.resolvedLocale)
            if (override !== undefined) {
              return override as LocalizedString
            }
          }
          return lookupResult.text
        }

        const missingResult = resolveMissing(messageId, currentLocale)
        if (missingResult !== undefined) {
          return missingResult
        }
      }

      if (id.message !== undefined) {
        return coreInterpolate(id.message, values, currentLocale) as LocalizedString
      }

      return (messageId ?? '') as LocalizedString
    }

    return resolveMessage(id, currentLocale, values)
  }

  const loadMessages = (loc: Locale, msgs: Messages): void => {
    // Intentional mutation: messages record is locally scoped to this context closure
    messages[loc] = { ...messages[loc], ...msgs }
    loadedLocalesSet.add(loc)
    setLoadedLocales(new Set(loadedLocalesSet))
  }

  const setLocale = async (newLocale: Locale): Promise<void> => {
    if (!lazyLocaleLoading || !chunkLoaderFn) {
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

    setIsLoading(true)
    try {
      const loaded = resolveChunkMessages(await chunkLoaderFn(newLocale))
      // Intentional mutation: messages record is locally scoped to this context closure
      messages[newLocale] = { ...messages[newLocale], ...loaded }
      loadedLocalesSet.add(newLocale)
      setLoadedLocales(new Set(loadedLocalesSet))
      if (splitRuntime?.__switchLocale) {
        await splitRuntime.__switchLocale(newLocale)
      }
      setLocaleSignal(newLocale)
    } finally {
      setIsLoading(false)
    }
  }

  const preloadLocale = async (loc: string): Promise<void> => {
    if (!lazyLocaleLoading || loadedLocalesSet.has(loc) || !chunkLoaderFn) return
    const splitRuntime = getSplitRuntimeModule()
    try {
      const loaded = resolveChunkMessages(await chunkLoaderFn(loc))
      // Intentional mutation: messages record is locally scoped to this context closure
      messages[loc] = { ...messages[loc], ...loaded }
      loadedLocalesSet.add(loc)
      setLoadedLocales(new Set(loadedLocalesSet))
      if (splitRuntime?.__preloadLocale) {
        await splitRuntime.__preloadLocale(loc)
      }
    } catch (e: unknown) {
      console.warn('[fluenti] preload failed:', loc, e)
    }
  }

  const getLocales = (): Locale[] => Object.keys(messages)

  const d = (value: Date | number, style?: string, loc?: string): LocalizedString =>
    formatDate(value, loc ?? locale(), style, i18nConfig.dateFormats) as LocalizedString

  const n = (value: number, style?: string, loc?: string): LocalizedString =>
    formatNumber(value, loc ?? locale(), style, i18nConfig.numberFormats) as LocalizedString

  const format = (message: string, values?: Record<string, unknown>): LocalizedString => {
    return coreInterpolate(message, values, locale()) as LocalizedString
  }

  const te = (key: string, loc?: string): boolean => {
    const targetLocale = loc ?? locale()
    const catalog = messages[targetLocale]
    return catalog !== undefined && key in catalog
  }

  const tm = (key: string, loc?: string): CompiledMessage | undefined => {
    const targetLocale = loc ?? locale()
    return messages[targetLocale]?.[key]
  }

  return { locale, setLocale, t, loadMessages, getLocales, d, n, format, isLoading, loadedLocales, preloadLocale, te, tm }
}

// ─── Module-level singleton ─────────────────────────────────────────────────

let globalCtx: I18nContext | undefined

function isHMR(): boolean {
  try {
    const g = globalThis as Record<string, unknown>
    // import.meta.hot is also truthy in Vitest; use a global flag for testability
    if (typeof g['__fluenti_hmr__'] !== 'undefined') {
      return !!g['__fluenti_hmr__']
    }
    return !!(import.meta as unknown as Record<string, unknown>)['hot']
  } catch {
    return false
  }
}

/**
 * Initialize the global i18n singleton.
 *
 * Call once at app startup (e.g. in your entry file) before any `useI18n()`.
 * Signals are created inside a `createRoot` so they outlive any component scope.
 *
 * Returns the context for convenience, but `useI18n()` will also find it.
 */
export function createFluenti(config: FluentiRuntimeConfig | I18nConfig): I18nContext {
  if (typeof window !== 'undefined' && globalCtx !== undefined) {
    if (isHMR()) {
      console.warn('[fluenti] HMR: replacing global i18n instance')
    } else {
      throw new Error(
        '[fluenti] createFluenti() has already been called. '
        + 'Use <I18nProvider> for multiple i18n instances, '
        + 'or call resetGlobalI18nContext() first (testing only).',
      )
    }
  }

  const ctx = createRoot(() => createI18nContext(config))

  if (typeof window !== 'undefined') {
    globalCtx = ctx
  } else {
    console.warn(
      '[fluenti] createFluenti() detected SSR environment. '
      + 'Use <I18nProvider> for per-request isolation in SSR.',
    )
  }

  return ctx
}

/** @deprecated Use {@link createFluenti} instead */
export const createFluentiSolid = createFluenti
/** @deprecated Use {@link createFluenti} instead */
export const createI18n = createFluenti

/** @internal — used by useI18n and I18nProvider */
export function getGlobalI18nContext(): I18nContext | undefined {
  return globalCtx
}

/** @internal — used by I18nProvider to set context without createRoot wrapper */
export function setGlobalI18nContext(ctx: I18nContext): void {
  if (globalCtx !== undefined) {
    throw new Error(
      '[fluenti] setGlobalI18nContext() has already been called. '
      + 'Use <I18nProvider> for multiple i18n instances.',
    )
  }
  globalCtx = ctx
}

/** @internal — reset the global singleton (for testing only) */
export function resetGlobalI18nContext(): void {
  globalCtx = undefined
}
