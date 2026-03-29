import { type App, type Ref, ref, shallowReactive } from 'vue'
import type { AllMessages, Locale, LocalizedString, Messages, CompiledMessage, MessageDescriptor, DiagnosticsConfig, CustomFormatter } from '@fluenti/core'
import { createFluentiCore } from '@fluenti/core'
import { FLUENTI_KEY } from './injection-key'
// Components are in @fluenti/vue/components subpath.
// Global component registration is opt-in via `components` config option.

/** Escape HTML special characters to prevent XSS. @internal */
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Compiled message chunk loader for lazy locale loading */
export type ChunkLoader = (
  locale: string,
) => Promise<Record<string, CompiledMessage> | { default: Record<string, CompiledMessage> }>

interface SplitRuntimeModule {
  __switchLocale?: (locale: string) => Promise<void>
  __preloadLocale?: (locale: string) => Promise<void>
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
export interface FluentiContext {
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
  preloadLocale(locale: string): void
  /** Check if a translation key exists in the catalog */
  te(key: string, locale?: string): boolean
  /** Get the raw compiled message without interpolation */
  tm(key: string, locale?: string): CompiledMessage | undefined
}

/** Injection key for providing/injecting fluenti context */
export { FLUENTI_KEY } from './injection-key'

/** Options for creating the Fluenti Vue plugin */
export interface FluentiConfig {
  locale: string
  fallbackLocale?: string
  messages: AllMessages
  missing?: (locale: string, id: string) => string | undefined
  dateFormats?: Record<string, Intl.DateTimeFormatOptions | 'relative'>
  numberFormats?: Record<string, Intl.NumberFormatOptions | ((locale: string) => Intl.NumberFormatOptions)>
  fallbackChain?: Record<string, string[]>
  /** Async chunk loader for lazy locale loading */
  chunkLoader?: ChunkLoader
  /** Enable lazy locale loading through chunkLoader */
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
  /** Runtime diagnostics configuration or pre-created instance */
  diagnostics?: DiagnosticsConfig | { missingKey: (locale: string, id: string) => void; fallbackUsed: (locale: string, fallbackLocale: string, id: string) => void; enabled: boolean }
  /**
   * Custom message interpolation function.
   *
   * By default, the runtime uses a lightweight `{key}` replacer.
   * Pass the full `interpolate` from `@fluenti/core/internal` for
   * runtime ICU MessageFormat parsing (adds ~2.5 KB gzip).
   *
   * @example
   * ```ts
   * import { interpolate } from '@fluenti/core/internal'
   * createFluenti({ interpolate, ... })
   * ```
   */
  interpolate?: (
    message: string,
    values: Record<string, unknown> | undefined,
    locale: string,
    formatters?: Record<string, CustomFormatter>,
  ) => string
  /**
   * Components to register globally via `app.component()`.
   *
   * Import from `@fluenti/vue/components` and pass here to enable global
   * component registration without bloating the default bundle.
   *
   * @example
   * ```ts
   * import * as components from '@fluenti/vue/components'
   * app.use(createFluenti({ components, ... }))
   * ```
   */
  components?: Record<string, unknown>
}

/** Return value of `createFluenti()` */
export interface FluentiPlugin {
  /** Vue plugin install method */
  install(app: App): void
  /** The global fluenti context (same as what useI18n returns) */
  global: FluentiContext
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
 *
 * @example
 * ```ts
 * import { createFluenti } from '@fluenti/vue'
 * import messages from './locales/compiled/en.js'
 *
 * const fluenti = createFluenti({
 *   locale: 'en',
 *   messages: { en: messages },
 * })
 *
 * app.use(fluenti)
 * ```
 */
export function createFluenti(options: FluentiConfig): FluentiPlugin {
  const lazyLocaleLoading = options.lazyLocaleLoading
    ?? (options as FluentiConfig & { splitting?: boolean }).splitting
    ?? false

  // Create the core i18n instance — delegates t/d/n/format/loadMessages/getLocales
  // Build config incrementally to satisfy exactOptionalPropertyTypes —
  // optional properties must not receive `undefined` as a value.
  const coreConfig: Parameters<typeof createFluentiCore>[0] = {
    locale: options.locale,
    messages: options.messages ?? {},
  }
  if (options.fallbackLocale !== undefined) coreConfig.fallbackLocale = options.fallbackLocale
  if (options.fallbackChain !== undefined) coreConfig.fallbackChain = options.fallbackChain
  if (options.dateFormats !== undefined) coreConfig.dateFormats = options.dateFormats
  if (options.numberFormats !== undefined) coreConfig.numberFormats = options.numberFormats
  if (options.missing !== undefined) coreConfig.missing = options.missing
  if (options.diagnostics !== undefined) coreConfig.diagnostics = options.diagnostics as Parameters<typeof createFluentiCore>[0]['diagnostics']
  if (options.interpolate !== undefined) coreConfig.interpolate = options.interpolate
  coreConfig.devWarnings = coreConfig.devWarnings ?? (typeof process !== 'undefined' && process.env?.['NODE_ENV'] === 'development')
  const i18n = createFluentiCore(coreConfig)

  const locale = ref(options.locale)
  // Intentional mutation: Vue's shallowReactive API requires in-place property assignment for reactivity
  const catalogs = shallowReactive<AllMessages>({ ...options.messages })
  const isLoading = ref(false)
  const loadedLocalesSet = new Set<string>([options.locale])
  const loadedLocales = ref<ReadonlySet<string>>(new Set(loadedLocalesSet))

  /** Local catalog lookup for te/tm (core doesn't expose raw catalog access) */
  function lookup(
    loc: Locale,
    id: string,
  ): CompiledMessage | undefined {
    const msgs = catalogs[loc]
    if (!msgs) return undefined
    return msgs[id]
  }

  /** Sync Vue reactive locale to core before delegation */
  function syncLocale(): void {
    if (i18n.locale !== locale.value) {
      i18n.locale = locale.value
    }
  }

  function t(strings: TemplateStringsArray, ...exprs: unknown[]): LocalizedString
  function t(id: string | MessageDescriptor, values?: Record<string, unknown>): LocalizedString
  function t(idOrStrings: string | MessageDescriptor | TemplateStringsArray, ...rest: unknown[]): LocalizedString {
    // Read locale.value and catalogs to register Vue reactive dependencies
    // so components re-render when locale or messages change
    const currentLocale = locale.value
    void catalogs[currentLocale]
    syncLocale()
    // Dispatch to the correct overload based on input type
    if (Array.isArray(idOrStrings) && 'raw' in idOrStrings) {
      return i18n.t(idOrStrings as TemplateStringsArray, ...rest)
    }
    return i18n.t(idOrStrings as string | MessageDescriptor, rest[0] as Record<string, unknown> | undefined)
  }

  let _localeRequestId = 0

  async function setLocale(newLocale: Locale): Promise<void> {
    if (!lazyLocaleLoading || !options.chunkLoader) {
      i18n.locale = newLocale
      locale.value = newLocale
      return
    }

    const splitRuntime = getSplitRuntimeModule()

    if (loadedLocalesSet.has(newLocale)) {
      // Already loaded, instant switch
      try {
        if (splitRuntime?.__switchLocale) {
          await splitRuntime.__switchLocale(newLocale)
        }
      } catch (e) {
        console.warn(`[fluenti] split runtime switch failed for locale "${newLocale}"`, e)
      }
      i18n.locale = newLocale
      locale.value = newLocale
      return
    }

    // Race-condition protection: track request ID
    const thisRequest = ++_localeRequestId
    isLoading.value = true
    try {
      const messages = resolveChunkMessages(await options.chunkLoader(newLocale))
      // Stale request — a newer setLocale call superseded this one
      if (thisRequest !== _localeRequestId) return
      // Intentional mutation: Vue's shallowReactive API requires in-place property assignment for reactivity
      catalogs[newLocale] = { ...catalogs[newLocale], ...messages }
      i18n.loadMessages(newLocale, messages)
      loadedLocalesSet.add(newLocale)
      loadedLocales.value = new Set(loadedLocalesSet)
      try {
        if (splitRuntime?.__switchLocale) {
          await splitRuntime.__switchLocale(newLocale)
        }
      } catch (e) {
        console.warn(`[fluenti] split runtime switch failed for locale "${newLocale}"`, e)
      }
      // Re-check after async __switchLocale — a newer setLocale() may have superseded this one
      if (thisRequest !== _localeRequestId) return
      i18n.locale = newLocale
      locale.value = newLocale
    } finally {
      if (thisRequest === _localeRequestId) {
        isLoading.value = false
      }
    }
  }

  function loadMessages(loc: Locale, messages: Messages): void {
    // Intentional mutation: Vue's shallowReactive API requires in-place property assignment for reactivity
    catalogs[loc] = { ...catalogs[loc], ...messages }
    i18n.loadMessages(loc, messages)
    loadedLocalesSet.add(loc)
    loadedLocales.value = new Set(loadedLocalesSet)
  }

  const _preloadInFlight = new Set<string>()

  function preloadLocale(loc: string): void {
    if (!lazyLocaleLoading || loadedLocalesSet.has(loc) || !options.chunkLoader || _preloadInFlight.has(loc)) return
    _preloadInFlight.add(loc)
    const splitRuntime = getSplitRuntimeModule()
    options.chunkLoader(loc).then(async (loaded) => {
      const messages = resolveChunkMessages(loaded)
      // Intentional mutation: Vue's shallowReactive API requires in-place property assignment for reactivity
      catalogs[loc] = { ...catalogs[loc], ...messages }
      i18n.loadMessages(loc, messages)
      loadedLocalesSet.add(loc)
      loadedLocales.value = new Set(loadedLocalesSet)
      if (splitRuntime?.__preloadLocale) {
        await splitRuntime.__preloadLocale(loc)
      }
    }).catch((e: unknown) => {
      console.warn('[fluenti] preload failed:', loc, e)
    }).finally(() => {
      _preloadInFlight.delete(loc)
    })
  }

  function getLocales(): Locale[] {
    syncLocale()
    return i18n.getLocales()
  }

  function d(value: Date | number, style?: string): LocalizedString {
    // Read locale.value to register a Vue reactive dependency
    void locale.value
    syncLocale()
    return i18n.d(value, style)
  }

  function n(value: number, style?: string): LocalizedString {
    // Read locale.value to register a Vue reactive dependency
    void locale.value
    syncLocale()
    return i18n.n(value, style)
  }

  function format(message: string, values?: Record<string, unknown>): LocalizedString {
    // Read locale.value to register a Vue reactive dependency
    void locale.value
    syncLocale()
    return i18n.format(message, values)
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

  const context: FluentiContext = {
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
      // Register components globally if provided via config
      if (options.components) {
        const prefix = options.componentPrefix ?? ''
        const comps = options.components as Record<string, unknown>
        if (comps['Trans']) app.component(`${prefix}Trans`, comps['Trans'] as any)
        if (comps['Plural']) app.component(`${prefix}Plural`, comps['Plural'] as any)
        if (comps['Select']) app.component(`${prefix}Select`, comps['Select'] as any)
        if (comps['DateTime']) app.component(`${prefix}DateTime`, comps['DateTime'] as any)
        if (comps['NumberFormat']) app.component(`${prefix}NumberFormat`, comps['NumberFormat'] as any)
      }
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
