import type { Messages, CompiledMessage, SplitRuntimeModule } from './types'

/** Resolve module default exports from dynamic imports. */
function resolveModuleMessages(
  loaded: Messages | { default: Messages },
): Messages {
  return typeof loaded === 'object' && loaded !== null && 'default' in loaded
    ? (loaded as { default: Messages }).default
    : loaded
}

/** Options for creating a locale loader. */
export interface LocaleLoaderOptions {
  /** Initial locale */
  locale: string
  /** Initial messages (keyed by locale) */
  messages?: Record<string, Messages>
  /** Async loader for fetching locale messages */
  loadMessages?: (locale: string) => Promise<Messages | { default: Messages }>
  /** Split runtime module (for code-splitting integration) */
  getSplitRuntime?: () => SplitRuntimeModule | null
  /** Called when locale changes */
  onLocaleChange?: (locale: string) => void
  /** Called when loading state changes */
  onLoadingChange?: (loading: boolean) => void
  /** Called when the loaded messages map changes */
  onMessagesChange?: (messages: Record<string, Messages>) => void
  /** Called when the set of loaded locales changes */
  onLoadedLocalesChange?: (locales: ReadonlySet<string>) => void
}

/** State object returned by createLocaleLoader. */
export interface LocaleLoaderState {
  /** Get current locale */
  getLocale(): string
  /** Get current messages */
  getMessages(): Record<string, Messages>
  /** Get loaded locales set */
  getLoadedLocales(): ReadonlySet<string>
  /** Get loading state */
  isLoading(): boolean
  /** Switch to a new locale with race-condition protection */
  setLocale(locale: string): Promise<void>
  /** Preload a locale without switching */
  preloadLocale(locale: string): Promise<void>
  /** Manually load messages for a locale */
  loadMessages(locale: string, messages: Messages): void
  /** Check if a key exists */
  te(key: string, locale?: string): boolean
  /** Get raw compiled message */
  tm(key: string, locale?: string): CompiledMessage | undefined
}

/**
 * Create a locale loader with built-in race-condition protection.
 *
 * This encapsulates the async locale loading pattern used by all framework
 * providers (React, Vue, Solid), including request-ID based stale-request
 * detection that was previously only in React.
 */
export function createLocaleLoader(options: LocaleLoaderOptions): LocaleLoaderState {
  let currentLocale = options.locale
  let loading = false
  let requestId = 0
  const messages: Record<string, Messages> = { ...options.messages }
  const loadedLocalesSet = new Set<string>(Object.keys(messages))

  const preloadInFlight = new Set<string>()

  function notifyLocale(): void { options.onLocaleChange?.(currentLocale) }
  function notifyLoading(): void { options.onLoadingChange?.(loading) }
  function notifyMessages(): void { options.onMessagesChange?.(messages) }
  function notifyLoadedLocales(): void { options.onLoadedLocalesChange?.(new Set(loadedLocalesSet)) }

  async function setLocale(newLocale: string): Promise<void> {
    // Already loaded: instant switch
    if (messages[newLocale] && !options.loadMessages) {
      currentLocale = newLocale
      notifyLocale()
      return
    }

    const splitRuntime = options.getSplitRuntime?.()

    if (messages[newLocale]) {
      if (splitRuntime?.__switchLocale) {
        await splitRuntime.__switchLocale(newLocale)
      }
      currentLocale = newLocale
      notifyLocale()
      return
    }

    if (!options.loadMessages) {
      console.warn(`[fluenti] No messages for locale "${newLocale}" and no loadMessages function provided`)
      return
    }

    // Race-condition protection: track request ID
    const thisRequest = ++requestId
    loading = true
    notifyLoading()

    try {
      const loaded = await options.loadMessages(newLocale)

      // Stale request — a newer setLocale call superseded this one
      if (thisRequest !== requestId) return

      const resolved = resolveModuleMessages(loaded)
      messages[newLocale] = resolved
      loadedLocalesSet.add(newLocale)
      notifyMessages()
      notifyLoadedLocales()

      if (splitRuntime?.__switchLocale) {
        await splitRuntime.__switchLocale(newLocale)
      }

      // Re-check after async __switchLocale — a newer setLocale() may have superseded this one
      if (thisRequest !== requestId) return

      currentLocale = newLocale
      notifyLocale()
    } catch (err) {
      if (thisRequest === requestId) {
        console.error(`[fluenti] Failed to load locale "${newLocale}"`, err)
      }
    } finally {
      if (thisRequest === requestId) {
        loading = false
        notifyLoading()
      }
    }
  }

  async function preloadLocale(locale: string): Promise<void> {
    if (loadedLocalesSet.has(locale) || preloadInFlight.has(locale) || !options.loadMessages) return

    preloadInFlight.add(locale)
    const splitRuntime = options.getSplitRuntime?.()
    try {
      const loaded = await options.loadMessages(locale)
      const resolved = resolveModuleMessages(loaded)
      messages[locale] = resolved
      loadedLocalesSet.add(locale)
      notifyMessages()
      notifyLoadedLocales()
      if (splitRuntime?.__preloadLocale) {
        await splitRuntime.__preloadLocale(locale)
      }
    } catch (e: unknown) {
      console.warn(`[fluenti] preload failed for locale "${locale}"`, e)
    } finally {
      preloadInFlight.delete(locale)
    }
  }

  function loadMessagesSync(locale: string, msgs: Messages): void {
    messages[locale] = { ...messages[locale], ...msgs }
    loadedLocalesSet.add(locale)
    notifyMessages()
    notifyLoadedLocales()
  }

  function te(key: string, locale?: string): boolean {
    const targetLocale = locale ?? currentLocale
    const catalog = messages[targetLocale]
    return catalog !== undefined && key in catalog
  }

  function tm(key: string, locale?: string): CompiledMessage | undefined {
    const targetLocale = locale ?? currentLocale
    return messages[targetLocale]?.[key]
  }

  return {
    getLocale: () => currentLocale,
    getMessages: () => messages,
    getLoadedLocales: () => new Set(loadedLocalesSet) as ReadonlySet<string>,
    isLoading: () => loading,
    setLocale,
    preloadLocale,
    loadMessages: loadMessagesSync,
    te,
    tm,
  }
}
