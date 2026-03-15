import { type App, type InjectionKey, type Ref, ref, shallowReactive } from 'vue'
import type { AllMessages, Locale, Messages, CompiledMessage } from '@fluenti/core'
import { interpolate, formatDate, formatNumber } from '@fluenti/core'
import { Trans } from './components/Trans'
import { Plural } from './components/Plural'
import { Select } from './components/Select'

/** Escape HTML special characters to prevent XSS. @internal */
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Compiled message chunk loader */
export type ChunkLoader = (locale: string) => Promise<Record<string, CompiledMessage>>

/** Context object returned by `useI18n()` and available as `$t` etc. on globalProperties */
export interface FluentVueContext {
  /** Translate a message by id or MessageDescriptor, with optional interpolation values */
  t(id: string | { id: string; message?: string }, values?: Record<string, unknown>): string
  /** Reactive ref for current locale */
  locale: Readonly<Ref<Locale>>
  /** Change the active locale (async when splitting is enabled) */
  setLocale(locale: Locale): Promise<void>
  /** Dynamically load messages for a locale */
  loadMessages(locale: Locale, messages: Messages): void
  /** Get all locales that have loaded messages */
  getLocales(): Locale[]
  /** Format a date value according to locale */
  d(value: Date | number, style?: string): string
  /** Format a number according to locale */
  n(value: number, style?: string): string
  /** Format an ICU message string directly (no catalog lookup) */
  format(message: string, values?: Record<string, unknown>): string
  /**
   * @deprecated Use `format()` instead. `tRaw` will be removed in a future major version.
   */
  tRaw(message: string, values?: Record<string, unknown>): string
  /** Whether a locale chunk is currently being loaded */
  isLoading: Readonly<Ref<boolean>>
  /** Set of locales whose messages have been loaded */
  loadedLocales: Readonly<Ref<ReadonlySet<string>>>
  /** Preload a locale in the background without switching to it */
  preloadLocale(locale: string): void
}

/** Injection key for providing/injecting fluenti context */
export const FLUENTI_KEY: InjectionKey<FluentVueContext> = Symbol('fluenti')

/** Options for creating the FluentVue plugin */
export interface FluentVueOptions {
  locale: string
  fallbackLocale?: string
  messages: AllMessages
  missing?: (locale: string, id: string) => string | undefined
  dateFormats?: Record<string, Intl.DateTimeFormatOptions | 'relative'>
  numberFormats?: Record<string, Intl.NumberFormatOptions | ((locale: string) => Intl.NumberFormatOptions)>
  fallbackChain?: Record<string, string[]>
  /** Async chunk loader for code-splitting mode */
  chunkLoader?: ChunkLoader
  /** Enable code-splitting mode */
  splitting?: boolean
}

/** Return value of `createFluentVue()` */
export interface FluentVuePlugin {
  /** Vue plugin install method */
  install(app: App): void
  /** The global fluenti context (same as what useI18n returns) */
  global: FluentVueContext
}

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
  // Use core interpolate for ICU message parsing (handles plural, select, etc.)
  return interpolate(compiled, values, locale)
}

/** Extract the attribute name from v-t modifiers (e.g., v-t.alt → 'alt') */
function getModifierAttr(modifiers: Partial<Record<string, boolean>>): string | undefined {
  const keys = Object.keys(modifiers).filter((k) => k !== 'plural')
  return keys.length > 0 ? keys[0] : undefined
}

/**
 * Create a Fluenti Vue plugin (SSR-safe, per-request instance).
 *
 * Each invocation creates entirely fresh state — no module-level singletons —
 * so it is safe to call once per SSR request.
 */
export function createFluentVue(options: FluentVueOptions): FluentVuePlugin {
  const locale = ref(options.locale)
  const catalogs = shallowReactive<AllMessages>({ ...options.messages })
  const isLoading = ref(false)
  const loadedLocalesSet = new Set<string>([options.locale])
  const loadedLocales = ref<ReadonlySet<string>>(new Set(loadedLocalesSet))

  function lookup(
    loc: Locale,
    id: string,
  ): CompiledMessage | undefined {
    const msgs = catalogs[loc]
    if (!msgs) return undefined
    return msgs[id]
  }

  function t(id: string | { id: string; message?: string }, values?: Record<string, unknown>): string {
    // Handle MessageDescriptor objects (from msg``)
    let messageId: string
    let fallbackMessage: string | undefined
    if (typeof id === 'object' && id !== null) {
      messageId = id.id
      fallbackMessage = id.message
    } else {
      messageId = id
    }

    // Read locale.value to register a Vue reactive dependency
    const currentLocale = locale.value

    // Build the chain of locales to try
    const chain: Locale[] = [currentLocale]

    // Add fallbackChain entries if configured (locale-specific, then wildcard '*')
    if (options.fallbackChain?.[currentLocale]) {
      chain.push(...options.fallbackChain[currentLocale])
    } else if (options.fallbackChain?.['*']) {
      chain.push(...options.fallbackChain['*'])
    }

    // Add the explicit fallbackLocale if not already included
    if (options.fallbackLocale && !chain.includes(options.fallbackLocale)) {
      chain.push(options.fallbackLocale)
    }

    for (const loc of chain) {
      const compiled = lookup(loc, messageId)
      if (compiled !== undefined) {
        return resolveMessage(compiled, values, loc)
      }
    }

    // Try the missing handler
    if (options.missing) {
      const result = options.missing(currentLocale, messageId)
      if (result !== undefined) return result
    }

    // If we have a fallback message from a MessageDescriptor, interpolate it
    if (fallbackMessage) {
      return interpolate(fallbackMessage, values, currentLocale)
    }

    // Final fallback — return the id itself
    return messageId
  }

  async function setLocale(newLocale: Locale): Promise<void> {
    if (!options.splitting || !options.chunkLoader) {
      // Synchronous path: no splitting, just switch
      locale.value = newLocale
      return
    }

    if (loadedLocalesSet.has(newLocale)) {
      // Already loaded, instant switch
      locale.value = newLocale
      return
    }

    // Async load
    isLoading.value = true
    try {
      const messages = await options.chunkLoader(newLocale)
      catalogs[newLocale] = { ...catalogs[newLocale], ...messages }
      loadedLocalesSet.add(newLocale)
      loadedLocales.value = new Set(loadedLocalesSet)
      locale.value = newLocale
    } finally {
      isLoading.value = false
    }
  }

  function loadMessages(loc: Locale, messages: Messages): void {
    catalogs[loc] = { ...catalogs[loc], ...messages }
    loadedLocalesSet.add(loc)
    loadedLocales.value = new Set(loadedLocalesSet)
  }

  function preloadLocale(loc: string): void {
    if (loadedLocalesSet.has(loc) || !options.chunkLoader) return
    options.chunkLoader(loc).then((messages) => {
      catalogs[loc] = { ...catalogs[loc], ...messages }
      loadedLocalesSet.add(loc)
      loadedLocales.value = new Set(loadedLocalesSet)
    }).catch(() => {
      // Silent failure for preload
    })
  }

  function getLocales(): Locale[] {
    return Object.keys(catalogs)
  }

  function d(value: Date | number, style?: string): string {
    const currentLocale = locale.value
    return formatDate(value, currentLocale, style, options.dateFormats)
  }

  function n(value: number, style?: string): string {
    const currentLocale = locale.value
    return formatNumber(value, currentLocale, style, options.numberFormats)
  }

  function format(message: string, values?: Record<string, unknown>): string {
    return resolveMessage(message, values, locale.value)
  }

  /** @deprecated Use `format()` instead. */
  function tRaw(message: string, values?: Record<string, unknown>): string {
    return format(message, values)
  }

  /**
   * Rich text helper for v-t with child elements.
   * Translates the message (which contains `<0>content</0>` placeholders),
   * then replaces each placeholder with the original HTML element.
   * Used via `v-html="$vtRich('msg', elements)"` in compile-time transforms.
   * @internal
   */
  function vtRich(
    message: string,
    elements: Array<{ tag: string; attrs: Record<string, string> }>,
    values?: Record<string, unknown>,
  ): string {
    const translated = values ? t(message, values) : t(message)
    // Escape the entire translated string first to neutralise any injected HTML
    const escaped = escapeHtml(translated)
    // Restore numbered placeholders (now escaped as &lt;0&gt;...&lt;/0&gt;) back to real HTML
    return escaped.replace(/&lt;(\d+)&gt;([\s\S]*?)&lt;\/\1&gt;/g, (_match, idxStr: string, content: string) => {
      const el = elements[Number(idxStr)]
      if (!el) return content
      const attrs = Object.entries(el.attrs)
        .map(([k, v]) => v ? `${escapeHtml(k)}="${escapeHtml(v)}"` : escapeHtml(k))
        .join(' ')
      const tag = escapeHtml(el.tag)
      return `<${tag}${attrs ? ' ' + attrs : ''}>${content}</${tag}>`
    })
  }

  const context: FluentVueContext = {
    t,
    locale,
    setLocale,
    loadMessages,
    getLocales,
    d,
    n,
    format,
    tRaw,
    isLoading,
    loadedLocales,
    preloadLocale,
  }

  return {
    install(app: App) {
      app.provide(FLUENTI_KEY, context)
      app.component('Trans', Trans)
      app.component('Plural', Plural)
      app.component('Select', Select)
      app.config.globalProperties['$t'] = t
      app.config.globalProperties['$d'] = d
      app.config.globalProperties['$n'] = n
      app.config.globalProperties['$vtRich'] = vtRich

      // Runtime v-t directive (fallback when compile-time transform is not used)
      app.directive('t', {
        mounted(el, binding) {
          const attrName = getModifierAttr(binding.modifiers)
          if (attrName) {
            // v-t.alt, v-t.placeholder, etc. — translate the attribute
            const original = el.getAttribute(attrName) ?? ''
            el.setAttribute(attrName, t(original))
          } else {
            // v-t or v-t:id — translate text content
            const id = binding.arg ?? el.textContent ?? ''
            el.textContent = t(id.trim(), binding.value != null ? { ...binding.value } : undefined)
          }
        },
        updated(el, binding) {
          const attrName = getModifierAttr(binding.modifiers)
          if (attrName) {
            const original = el.getAttribute(attrName) ?? ''
            el.setAttribute(attrName, t(original))
          } else {
            const id = binding.arg ?? el.textContent ?? ''
            el.textContent = t(id.trim(), binding.value != null ? { ...binding.value } : undefined)
          }
        },
      })
    },
    global: context,
  }
}

