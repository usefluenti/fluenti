import { createSignal, createRoot, type Accessor } from 'solid-js'
import { formatDate, formatNumber, interpolate as coreInterpolate } from '@fluenti/core'
import type { FluentConfig, Locale, Messages, CompiledMessage, MessageDescriptor, DateFormatOptions, NumberFormatOptions } from '@fluenti/core'

/** Chunk loader for code-splitting mode */
export type ChunkLoader = (locale: string) => Promise<Record<string, CompiledMessage>>

/** Extended config with splitting support */
export interface I18nConfig extends FluentConfig {
  /** Async chunk loader for code-splitting mode */
  chunkLoader?: ChunkLoader
  /** Enable code-splitting mode */
  splitting?: boolean
  /** Named date format styles */
  dateFormats?: DateFormatOptions
  /** Named number format styles */
  numberFormats?: NumberFormatOptions
}

/** Reactive i18n context holding locale signal and translation utilities */
export interface I18nContext {
  /** Reactive accessor for the current locale */
  locale(): Locale
  /** Set the active locale (async when splitting is enabled) */
  setLocale(locale: Locale): Promise<void>
  /** Translate a message by id with optional interpolation values */
  t(id: string | MessageDescriptor, values?: Record<string, unknown>): string
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
  /**
   * @deprecated Use `format()` instead. `tRaw` will be removed in a future major version.
   */
  tRaw(message: string, values?: Record<string, unknown>): string
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
  const messages: Record<string, Record<string, unknown>> = { ...config.messages }
  const i18nConfig = config as I18nConfig

  function resolveMessage(
    id: string,
    loc: Locale,
    values?: Record<string, unknown>,
  ): string {
    const catalog = messages[loc]
    if (!catalog) {
      return fallbackOrMissing(id, loc, values)
    }

    const msg = catalog[id]
    if (msg === undefined) {
      return fallbackOrMissing(id, loc, values)
    }

    if (typeof msg === 'function') {
      return (msg as (v?: Record<string, unknown>) => string)(values)
    }

    if (typeof msg === 'string' && values) {
      return interpolate(msg, values)
    }

    return String(msg)
  }

  function fallbackOrMissing(
    id: string,
    loc: Locale,
    values?: Record<string, unknown>,
  ): string {
    if (config.fallbackLocale && loc !== config.fallbackLocale) {
      return resolveMessage(id, config.fallbackLocale, values)
    }
    if (config.missing) {
      const result = config.missing(loc, id)
      if (result !== undefined) return result
    }
    // If the id looks like an ICU message, interpolate it directly
    // (compile-time transforms like <Plural> emit inline ICU as t() arguments)
    if (id.includes('{')) {
      return coreInterpolate(id, values, loc)
    }
    return id
  }

  function interpolate(template: string, values: Record<string, unknown>): string {
    return template.replace(
      /\{(\w+)\}/g,
      (_, key: string) => String(values[key] ?? `{${key}}`),
    )
  }

  const t = (id: string | MessageDescriptor, values?: Record<string, unknown>): string => {
    const currentLocale = locale() // reactive dependency
    let messageId: string
    let fallbackMessage: string | undefined
    if (typeof id === 'object' && id !== null) {
      messageId = id.id
      fallbackMessage = id.message
    } else {
      messageId = id
    }
    const result = resolveMessage(messageId, currentLocale, values)
    if (result === messageId && fallbackMessage) {
      return values ? interpolate(fallbackMessage, values) : fallbackMessage
    }
    return result
  }

  const loadMessages = (loc: Locale, msgs: Messages): void => {
    messages[loc] = { ...messages[loc], ...msgs }
    loadedLocalesSet.add(loc)
    setLoadedLocales(new Set(loadedLocalesSet))
  }

  const setLocale = async (newLocale: Locale): Promise<void> => {
    if (!i18nConfig.splitting || !i18nConfig.chunkLoader) {
      setLocaleSignal(newLocale)
      return
    }

    if (loadedLocalesSet.has(newLocale)) {
      setLocaleSignal(newLocale)
      return
    }

    setIsLoading(true)
    try {
      const loaded = await i18nConfig.chunkLoader(newLocale)
      messages[newLocale] = { ...messages[newLocale], ...loaded }
      loadedLocalesSet.add(newLocale)
      setLoadedLocales(new Set(loadedLocalesSet))
      setLocaleSignal(newLocale)
    } finally {
      setIsLoading(false)
    }
  }

  const preloadLocale = (loc: string): void => {
    if (loadedLocalesSet.has(loc) || !i18nConfig.chunkLoader) return
    i18nConfig.chunkLoader(loc).then((loaded) => {
      messages[loc] = { ...messages[loc], ...loaded }
      loadedLocalesSet.add(loc)
      setLoadedLocales(new Set(loadedLocalesSet))
    }).catch(() => {
      // Silent failure for preload
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

  /** @deprecated Use `format()` instead. */
  const tRaw = (message: string, values?: Record<string, unknown>): string => {
    return format(message, values)
  }

  return { locale, setLocale, t, loadMessages, getLocales, d, n, format, tRaw, isLoading, loadedLocales, preloadLocale }
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
    // Still set globalCtx as fallback, but document the risk
    globalCtx = ctx
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
