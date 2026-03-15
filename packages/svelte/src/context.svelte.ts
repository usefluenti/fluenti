import { setContext, getContext } from 'svelte'
import { interpolate, formatDate, formatNumber } from '@fluenti/core'
import type { Locale, Messages, CompiledMessage, MessageDescriptor } from '@fluenti/core'
import type { I18nContextOptions, I18nContext } from './types'

const I18N_KEY = Symbol('fluenti')

/**
 * Resolve a compiled message to a string, applying values if needed.
 * @internal
 */
function resolveMessage(
  compiled: CompiledMessage,
  values?: Record<string, unknown>,
  locale?: string,
): string {
  if (typeof compiled === 'function') {
    return compiled(values)
  }
  return interpolate(compiled, values, locale)
}

/**
 * Set up the Fluenti i18n context for the component tree.
 * Must be called during component initialization (in `<script>` of a layout or root component).
 *
 * Uses Svelte 5 runes ($state) for reactive locale and loading state.
 */
export function setI18nContext(options: I18nContextOptions): I18nContext {
  let locale = $state(options.locale)
  let isLoading = $state(false)
  let loadedLocales = $state<string[]>(
    options.messages ? Object.keys(options.messages) : [options.locale],
  )
  let catalogs = $state<Record<string, Messages>>(
    options.messages ? { ...options.messages } : {},
  )

  function lookup(loc: Locale, id: string): CompiledMessage | undefined {
    const msgs = catalogs[loc]
    if (!msgs) return undefined
    return msgs[id]
  }

  function t(id: string | MessageDescriptor, values?: Record<string, unknown>): string {
    let messageId: string
    let fallbackMessage: string | undefined
    if (typeof id === 'object' && id !== null) {
      messageId = id.id
      fallbackMessage = id.message
    } else {
      messageId = id
    }

    // Read locale to register reactive dependency
    const currentLocale = locale

    // Build chain of locales to try
    const chain: Locale[] = [currentLocale]

    if (options.fallbackChain?.[currentLocale]) {
      chain.push(...options.fallbackChain[currentLocale])
    } else if (options.fallbackChain?.['*']) {
      chain.push(...options.fallbackChain['*'])
    }

    if (options.fallbackLocale && !chain.includes(options.fallbackLocale)) {
      chain.push(options.fallbackLocale)
    }

    for (const loc of chain) {
      const compiled = lookup(loc, messageId)
      if (compiled !== undefined) {
        return resolveMessage(compiled, values, loc)
      }
    }

    // If we have a fallback message from a MessageDescriptor, interpolate it
    if (fallbackMessage) {
      return interpolate(fallbackMessage, values, currentLocale)
    }

    // Final fallback — return the id itself
    return messageId
  }

  async function setLocale(newLocale: string): Promise<void> {
    if (catalogs[newLocale]) {
      locale = newLocale
      return
    }

    if (!options.loadMessages) {
      console.warn(`[fluenti] No messages for "${newLocale}" and no loadMessages configured`)
      locale = newLocale
      return
    }

    isLoading = true
    try {
      const msgs = await options.loadMessages(newLocale)
      const resolved = (msgs as Record<string, unknown>)['default'] ?? msgs
      catalogs = { ...catalogs, [newLocale]: resolved as Messages }
      loadedLocales = [...new Set([...loadedLocales, newLocale])]
      locale = newLocale
    } catch (err) {
      console.error(`[fluenti] Failed to load "${newLocale}"`, err)
    } finally {
      isLoading = false
    }
  }

  async function preloadLocale(loc: string): Promise<void> {
    if (catalogs[loc] || !options.loadMessages) return
    try {
      const msgs = await options.loadMessages(loc)
      const resolved = (msgs as Record<string, unknown>)['default'] ?? msgs
      catalogs = { ...catalogs, [loc]: resolved as Messages }
      loadedLocales = [...new Set([...loadedLocales, loc])]
    } catch {
      // Silent failure for preload
    }
  }

  function d(value: Date | number, style?: string): string {
    return formatDate(value, locale, style, options.dateFormats)
  }

  function n(value: number, style?: string): string {
    return formatNumber(value, locale, style, options.numberFormats)
  }

  function format(message: string, values?: Record<string, unknown>): string {
    return interpolate(message, values, locale)
  }

  function loadMessages(loc: Locale, messages: Messages): void {
    catalogs = { ...catalogs, [loc]: { ...catalogs[loc], ...messages } }
    loadedLocales = [...new Set([...loadedLocales, loc])]
  }

  function getLocales(): Locale[] {
    return Object.keys(catalogs)
  }

  const ctx: I18nContext = {
    get locale() { return locale },
    get isLoading() { return isLoading },
    get loadedLocales() { return loadedLocales },
    setLocale,
    preloadLocale,
    t,
    d,
    n,
    format,
    loadMessages,
    getLocales,
  }

  setContext(I18N_KEY, ctx)
  return ctx
}

/**
 * Retrieve the Fluenti i18n context from a parent component.
 * Must be called during component initialization.
 */
export function getI18n(): I18nContext {
  const ctx = getContext<I18nContext>(I18N_KEY)
  if (!ctx) {
    throw new Error('[fluenti] setI18nContext() must be called in a parent component')
  }
  return ctx
}

/**
 * Internal: used by Vite plugin compiled output.
 * @internal
 */
export function __getI18n(): I18nContext {
  return getI18n()
}
