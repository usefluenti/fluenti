import { type App, type InjectionKey, type Ref, ref, shallowReactive } from 'vue'
import type { AllMessages, Locale, LocalizedString, Messages, CompiledMessage, MessageDescriptor, ChunkLoader, SplitRuntimeModule } from '@fluenti/core'
import { interpolate, formatDate, formatNumber, buildICUMessage, resolveDescriptorId } from '@fluenti/core'
import { Trans } from './components/Trans'
import { Plural } from './components/Plural'
import { Select } from './components/Select'
import { DateTime } from './components/DateTime'
import { NumberFormat } from './components/NumberFormat'

/** Escape HTML special characters to prevent XSS. @internal */
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const SPLIT_RUNTIME_KEY = Symbol.for('fluenti.runtime.vue.v1')

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

/** Context object returned by `useI18n()` and available as `$t` etc. on globalProperties */
export interface FluentVueContext {
  /** Translate a message by id or MessageDescriptor, with optional interpolation values */
  t(id: string | MessageDescriptor, values?: Record<string, unknown>): LocalizedString
  /** Tagged template form: t`Hello ${name}` */
  t(strings: TemplateStringsArray, ...exprs: unknown[]): LocalizedString
  /** Reactive ref for current locale */
  locale: Readonly<Ref<Locale>>
  /** Change the active locale (async when lazy locale loading is enabled) */
  setLocale(locale: Locale): Promise<void>
  /** Dynamically load messages for a locale */
  loadMessages(locale: Locale, messages: Messages): void
  /** Get all locales that have loaded messages */
  getLocales(): Locale[]
  /** Format a date value according to locale */
  d(value: Date | number, style?: string): LocalizedString
  /** Format a number according to locale */
  n(value: number, style?: string): LocalizedString
  /** Format an ICU message string directly (no catalog lookup) */
  format(message: string, values?: Record<string, unknown>): LocalizedString
  /** Whether a locale chunk is currently being loaded */
  isLoading: Readonly<Ref<boolean>>
  /** Set of locales whose messages have been loaded */
  loadedLocales: Readonly<Ref<ReadonlySet<string>>>
  /** Preload a locale in the background without switching to it */
  preloadLocale(locale: string): Promise<void>
  /** Check if a translation key exists in the catalog */
  te(key: string, locale?: string): boolean
  /** Get the raw compiled message without interpolation */
  tm(key: string, locale?: string): CompiledMessage | undefined
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
  /**
   * Prefix for globally registered components (Trans, Plural, Select).
   *
   * Set this to avoid naming conflicts with other libraries.
   *
   * @example
   * componentPrefix: 'I18n'
   * // Registers: I18nTrans, I18nPlural, I18nSelect
   *
   * @example
   * componentPrefix: 'Fluenti'
   * // Registers: FluentiTrans, FluentiPlural, FluentiSelect
   *
   * @default '' (no prefix — Trans, Plural, Select)
   */
  componentPrefix?: string
  /**
   * Whether to inject `$t`, `$d`, `$n`, `$vtRich` onto `app.config.globalProperties`.
   *
   * Set to `false` to avoid polluting the global namespace (e.g. when migrating from vue-i18n
   * or when using composition API exclusively via `useI18n()`).
   *
   * @default true
   */
  injectGlobalProperties?: boolean
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
): LocalizedString {
  if (typeof compiled === 'function') {
    return compiled(values) as LocalizedString
  }
  // Use core interpolate for ICU message parsing (handles plural, select, etc.)
  return interpolate(compiled, values, locale) as LocalizedString
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
  const chunkLoaderFn = options.loadMessages ?? options.chunkLoader
  const lazyLocaleLoading = options.lazyLocaleLoading
    ?? (options as FluentVueOptions & { splitting?: boolean }).splitting
    ?? false
  const locale = ref(options.locale)
  // Intentional mutation: Vue's shallowReactive API requires in-place property assignment for reactivity
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

  function t(strings: TemplateStringsArray, ...exprs: unknown[]): LocalizedString
  function t(id: string | MessageDescriptor, values?: Record<string, unknown>): LocalizedString
  function t(idOrStrings: string | MessageDescriptor | TemplateStringsArray, ...rest: unknown[]): LocalizedString {
    // Tagged template form: t`Hello ${name}`
    if (Array.isArray(idOrStrings) && 'raw' in idOrStrings) {
      const strings = idOrStrings as TemplateStringsArray
      const icu = buildICUMessage(strings, rest)
      const values = Object.fromEntries(rest.map((v, i) => [String(i), v]))
      // Delegate to the function-call path with the ICU string as the id
      return t(icu, values)
    }

    // Function call form
    const id = idOrStrings as string | MessageDescriptor
    const values = rest[0] as Record<string, unknown> | undefined

    // Handle MessageDescriptor objects (from msg``)
    let messageId: string
    let fallbackMessage: string | undefined
    if (typeof id === 'object' && id !== null) {
      messageId = resolveDescriptorId(id) ?? ''
      fallbackMessage = id.message
    } else {
      messageId = id
    }

    // Read locale.value to register a Vue reactive dependency
    const currentLocale = locale.value

    // Build the chain of locales to try
    const chain: Locale[] = [currentLocale]

    if (options.fallbackLocale && !chain.includes(options.fallbackLocale)) {
      chain.push(options.fallbackLocale)
    }

    if (options.fallbackChain?.[currentLocale]) {
      for (const fallback of options.fallbackChain[currentLocale]) {
        if (!chain.includes(fallback)) {
          chain.push(fallback)
        }
      }
    } else if (options.fallbackChain?.['*']) {
      for (const fallback of options.fallbackChain['*']) {
        if (!chain.includes(fallback)) {
          chain.push(fallback)
        }
      }
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
      if (result !== undefined) return result as LocalizedString
    }

    // If we have a fallback message from a MessageDescriptor, interpolate it
    if (fallbackMessage) {
      return interpolate(fallbackMessage, values, currentLocale) as LocalizedString
    }

    // Final fallback — if the id looks like an ICU message, interpolate it
    // (compile-time transforms like <Plural> emit inline ICU as t() arguments)
    if (messageId.includes('{')) {
      return interpolate(messageId, values, currentLocale) as LocalizedString
    }
    return messageId as LocalizedString
  }

  async function setLocale(newLocale: Locale): Promise<void> {
    if (!lazyLocaleLoading || !chunkLoaderFn) {
      locale.value = newLocale
      return
    }

    const splitRuntime = getSplitRuntimeModule()

    if (loadedLocalesSet.has(newLocale)) {
      // Already loaded, instant switch
      if (splitRuntime?.__switchLocale) {
        await splitRuntime.__switchLocale(newLocale)
      }
      locale.value = newLocale
      return
    }

    // Async load
    isLoading.value = true
    try {
      const messages = resolveChunkMessages(await chunkLoaderFn(newLocale))
      // Intentional mutation: Vue's shallowReactive API requires in-place property assignment for reactivity
      catalogs[newLocale] = { ...catalogs[newLocale], ...messages }
      loadedLocalesSet.add(newLocale)
      loadedLocales.value = new Set(loadedLocalesSet)
      if (splitRuntime?.__switchLocale) {
        await splitRuntime.__switchLocale(newLocale)
      }
      locale.value = newLocale
    } finally {
      isLoading.value = false
    }
  }

  function loadMessages(loc: Locale, messages: Messages): void {
    // Intentional mutation: Vue's shallowReactive API requires in-place property assignment for reactivity
    catalogs[loc] = { ...catalogs[loc], ...messages }
    loadedLocalesSet.add(loc)
    loadedLocales.value = new Set(loadedLocalesSet)
  }

  async function preloadLocale(loc: string): Promise<void> {
    if (!lazyLocaleLoading || loadedLocalesSet.has(loc) || !chunkLoaderFn) return
    const splitRuntime = getSplitRuntimeModule()
    try {
      const loaded = resolveChunkMessages(await chunkLoaderFn(loc))
      // Intentional mutation: Vue's shallowReactive API requires in-place property assignment for reactivity
      catalogs[loc] = { ...catalogs[loc], ...loaded }
      loadedLocalesSet.add(loc)
      loadedLocales.value = new Set(loadedLocalesSet)
      if (splitRuntime?.__preloadLocale) {
        await splitRuntime.__preloadLocale(loc)
      }
    } catch (e: unknown) {
      console.warn('[fluenti] preload failed:', loc, e)
    }
  }

  function getLocales(): Locale[] {
    return Object.keys(catalogs)
  }

  function d(value: Date | number, style?: string): LocalizedString {
    const currentLocale = locale.value
    return formatDate(value, currentLocale, style, options.dateFormats) as LocalizedString
  }

  function n(value: number, style?: string): LocalizedString {
    const currentLocale = locale.value
    return formatNumber(value, currentLocale, style, options.numberFormats) as LocalizedString
  }

  function format(message: string, values?: Record<string, unknown>): LocalizedString {
    return resolveMessage(message, values, locale.value)
  }

  /**
   * Rich text helper for v-t with child elements.
   * Translates the message (which contains `<0>content</0>` placeholders),
   * then replaces each placeholder with the original HTML element.
   * Used via `v-html="$vtRich('msg', elements)"` in compile-time transforms.
   * @internal
   */
  function vtRich(
    message: string | MessageDescriptor,
    elements: Array<{ tag: string; attrs?: Record<string, string>; rawAttrs?: string }>,
    values?: Record<string, unknown>,
  ): string {
    const translated = values ? t(message, values) : t(message)
    // Escape the entire translated string first to neutralise any injected HTML
    const escaped = escapeHtml(translated)

    // Helper to build attribute string from element.
    // Both rawAttrs and attrs are escaped to prevent XSS — even though rawAttrs
    // originates from compile-time transforms, $vtRich is exposed on globalProperties
    // so we apply defence-in-depth.
    function buildAttrs(el: { attrs?: Record<string, string>; rawAttrs?: string }): string {
      if (el.rawAttrs != null && el.rawAttrs !== '') {
        // Parse rawAttrs back into key/value pairs and escape each one.
        // Handles: key="val", key='val', and bare key (boolean attribute).
        const parts: string[] = []
        const attrRe = /([\w:@.!-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g
        let m: RegExpExecArray | null
        while ((m = attrRe.exec(el.rawAttrs)) !== null) {
          const key = escapeHtml(m[1]!)
          const val = m[2] ?? m[3]
          parts.push(val !== undefined ? `${key}="${escapeHtml(val)}"` : key)
        }
        return parts.join(' ')
      }
      if (!el.attrs) return ''
      return Object.entries(el.attrs)
        .map(([k, v]) => v ? `${escapeHtml(k)}="${escapeHtml(v)}"` : escapeHtml(k))
        .join(' ')
    }

    // First: handle self-closing <idx/> (escaped as &lt;idx/&gt;)
    let result = escaped.replace(/&lt;(\d+)\/&gt;/g, (_match, idxStr: string) => {
      const el = elements[Number(idxStr)]
      if (!el) return ''
      const tag = escapeHtml(el.tag)
      const attrs = buildAttrs(el)
      return `<${tag}${attrs ? ' ' + attrs : ''} />`
    })

    // Then: handle paired <idx>content</idx>
    result = result.replace(/&lt;(\d+)&gt;([\s\S]*?)&lt;\/\1&gt;/g, (_match, idxStr: string, content: string) => {
      const el = elements[Number(idxStr)]
      if (!el) return content
      const tag = escapeHtml(el.tag)
      const attrs = buildAttrs(el)
      return `<${tag}${attrs ? ' ' + attrs : ''}>${content}</${tag}>`
    })

    return result
  }

  function te(key: string, loc?: string): boolean {
    const targetLocale = loc ?? locale.value
    return lookup(targetLocale, key) !== undefined
  }

  function tm(key: string, loc?: string): CompiledMessage | undefined {
    const targetLocale = loc ?? locale.value
    return lookup(targetLocale, key)
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
    isLoading,
    loadedLocales,
    preloadLocale,
    te,
    tm,
  }

  return {
    install(app: App) {
      app.provide(FLUENTI_KEY, context)
      const prefix = options.componentPrefix ?? ''
      app.component(`${prefix}Trans`, Trans)
      app.component(`${prefix}Plural`, Plural)
      app.component(`${prefix}Select`, Select)
      app.component(`${prefix}DateTime`, DateTime)
      app.component(`${prefix}NumberFormat`, NumberFormat)
      if (options.injectGlobalProperties !== false) {
        app.config.globalProperties['$t'] = t
        app.config.globalProperties['$d'] = d
        app.config.globalProperties['$n'] = n
        app.config.globalProperties['$vtRich'] = vtRich
      }

      // Runtime v-t directive (fallback when compile-time transform is not used)
      const vtOriginalIds = new WeakMap<HTMLElement, string>()
      app.directive('t', {
        mounted(el, binding) {
          const attrName = getModifierAttr(binding.modifiers)
          if (attrName) {
            // v-t.alt, v-t.placeholder, etc. — translate the attribute
            const original = el.getAttribute(attrName) ?? ''
            vtOriginalIds.set(el, original)
            el.setAttribute(attrName, t(original))
          } else {
            // v-t or v-t:id — translate text content
            const id = binding.arg ?? el.textContent ?? ''
            vtOriginalIds.set(el, id.trim())
            el.textContent = t(id.trim(), binding.value != null ? { ...binding.value } : undefined)
          }
        },
        updated(el, binding) {
          const attrName = getModifierAttr(binding.modifiers)
          if (attrName) {
            const original = vtOriginalIds.get(el) ?? el.getAttribute(attrName) ?? ''
            el.setAttribute(attrName, t(original))
          } else {
            const id = binding.arg ?? vtOriginalIds.get(el) ?? ''
            el.textContent = t(id.trim(), binding.value != null ? { ...binding.value } : undefined)
          }
        },
      })
    },
    global: context,
  }
}
