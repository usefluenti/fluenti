import { createSignal, createRoot, type Accessor } from 'solid-js'
import { formatDate, formatNumber, interpolate as coreInterpolate, buildICUMessage, resolveDescriptorId } from '@fluenti/core'
import type { FluentConfig, Locale, Messages, CompiledMessage, MessageDescriptor, DateFormatOptions, NumberFormatOptions } from '@fluenti/core'

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

/** Extended config with lazy locale loading support */
export interface I18nConfig extends FluentConfig {
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
}

/** Reactive i18n context holding locale signal and translation utilities */
export interface I18nContext {
  /** Reactive accessor for the current locale */
  locale(): Locale
  /** Set the active locale (async when lazy locale loading is enabled) */
  setLocale(locale: Locale): Promise<void>
  /** Translate a message by id with optional interpolation values */
  t(id: string | MessageDescriptor, values?: Record<string, unknown>): string
  /** Tagged template form: t`Hello ${name}` */
  t(strings: TemplateStringsArray, ...exprs: unknown[]): string
  /** Merge additional messages into a locale catalog at runtime */
  loadMessages(locale: Locale, messages: Messages): void
  /** Return all locale codes that have loaded messages */
  getLocales(): Locale[]
  /** Format a date value for the current locale */
  d(value: Date | number, style?: string): string
  /** Format a number value for the current locale */
  n(value: number, style?: string): string
  /** Format an ICU message string directly (no catalog lookup) */
  format(message: string, values?: Record<string, unknown>): string
  /** Whether a locale chunk is currently being loaded */
  isLoading: Accessor<boolean>
  /** Set of locales whose messages have been loaded */
  loadedLocales: Accessor<Set<string>>
  /** Preload a locale in the background without switching to it */
  preloadLocale(locale: string): void
}

/**
 * Create a reactive i18n context backed by Solid signals.
 *
 * The returned `t()` reads the internal `locale()` signal, so any
 * Solid computation that calls `t()` will re-run when the locale changes.
 */
export function createI18nContext(config: FluentConfig | I18nConfig): I18nContext {
  const [locale, setLocaleSignal] = createSignal<Locale>(config.locale)
  const [isLoading, setIsLoading] = createSignal(false)
  const loadedLocalesSet = new Set<string>([config.locale])
  const [loadedLocales, setLoadedLocales] = createSignal(new Set(loadedLocalesSet))
  const messages: Record<string, Messages> = { ...config.messages }
  const i18nConfig = config as I18nConfig
  const lazyLocaleLoading = i18nConfig.lazyLocaleLoading
    ?? (config as I18nConfig & { splitting?: boolean }).splitting
    ?? false

  function lookupCatalog(
    id: string,
    loc: Locale,
    values?: Record<string, unknown>,
  ): string | undefined {
    const catalog = messages[loc]
    if (!catalog) {
      return undefined
    }

    const msg = catalog[id]
    if (msg === undefined) {
      return undefined
    }

    if (typeof msg === 'function') {
      return msg(values)
    }

    if (typeof msg === 'string' && values) {
      return coreInterpolate(msg, values, loc)
    }

    return String(msg)
  }

  function lookupWithFallbacks(
    id: string,
    loc: Locale,
    values?: Record<string, unknown>,
  ): string | undefined {
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
        return result
      }
    }

    return undefined
  }

  function resolveMissing(
    id: string,
    loc: Locale,
  ): string | undefined {
    if (!config.missing) {
      return undefined
    }

    const result = config.missing(loc, id)
    if (result !== undefined) {
      return result
    }
    return undefined
  }

  function resolveMessage(
    id: string,
    loc: Locale,
    values?: Record<string, unknown>,
  ): string {
    const catalogResult = lookupWithFallbacks(id, loc, values)
    if (catalogResult !== undefined) {
      return catalogResult
    }

    const missingResult = resolveMissing(id, loc)
    if (missingResult !== undefined) {
      return missingResult
    }

    if (id.includes('{')) {
      return coreInterpolate(id, values, loc)
    }

    return id
  }

  function t(strings: TemplateStringsArray, ...exprs: unknown[]): string
  function t(id: string | MessageDescriptor, values?: Record<string, unknown>): string
  function t(idOrStrings: string | MessageDescriptor | TemplateStringsArray, ...rest: unknown[]): string {
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
        const catalogResult = lookupWithFallbacks(messageId, currentLocale, values)
        if (catalogResult !== undefined) {
          return catalogResult
        }

        const missingResult = resolveMissing(messageId, currentLocale)
        if (missingResult !== undefined) {
          return missingResult
        }
      }

      if (id.message !== undefined) {
        return coreInterpolate(id.message, values, currentLocale)
      }

      return messageId ?? ''
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

    setIsLoading(true)
    try {
      const loaded = resolveChunkMessages(await i18nConfig.chunkLoader(newLocale))
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

  const preloadLocale = (loc: string): void => {
    if (!lazyLocaleLoading || loadedLocalesSet.has(loc) || !i18nConfig.chunkLoader) return
    const splitRuntime = getSplitRuntimeModule()
    i18nConfig.chunkLoader(loc).then(async (loaded) => {
      const resolved = resolveChunkMessages(loaded)
      // Intentional mutation: messages record is locally scoped to this context closure
      messages[loc] = { ...messages[loc], ...resolved }
      loadedLocalesSet.add(loc)
      setLoadedLocales(new Set(loadedLocalesSet))
      if (splitRuntime?.__preloadLocale) {
        await splitRuntime.__preloadLocale(loc)
      }
    }).catch((e: unknown) => {
      console.warn('[fluenti] preload failed:', loc, e)
    })
  }

  const getLocales = (): Locale[] => Object.keys(messages)

  const d = (value: Date | number, style?: string): string =>
    formatDate(value, locale(), style, i18nConfig.dateFormats)

  const n = (value: number, style?: string): string =>
    formatNumber(value, locale(), style, i18nConfig.numberFormats)

  const format = (message: string, values?: Record<string, unknown>): string => {
    return coreInterpolate(message, values, locale())
  }

  return { locale, setLocale, t, loadMessages, getLocales, d, n, format, isLoading, loadedLocales, preloadLocale }
}

// ─── Module-level singleton ─────────────────────────────────────────────────

let globalCtx: I18nContext | undefined

/**
 * Initialize the global i18n singleton.
 *
 * Call once at app startup (e.g. in your entry file) before any `useI18n()`.
 * Signals are created inside a `createRoot` so they outlive any component scope.
 *
 * Returns the context for convenience, but `useI18n()` will also find it.
 */
export function createI18n(config: FluentConfig | I18nConfig): I18nContext {
  const ctx = createRoot(() => createI18nContext(config))

  // Only set global singleton in browser (client-side).
  // In SSR, each request should use <I18nProvider> for per-request isolation.
  if (typeof window !== 'undefined') {
    globalCtx = ctx
  } else {
    console.warn(
      '[fluenti] createI18n() detected SSR environment. ' +
      'Use <I18nProvider> for per-request isolation in SSR.',
    )
  }

  return ctx
}

/** @internal — used by useI18n and I18nProvider */
export function getGlobalI18nContext(): I18nContext | undefined {
  return globalCtx
}

/** @internal — used by I18nProvider to set context without createRoot wrapper */
export function setGlobalI18nContext(ctx: I18nContext): void {
  globalCtx = ctx
}

/** @internal — reset the global singleton (for testing only) */
export function resetGlobalI18nContext(): void {
  globalCtx = undefined
}
