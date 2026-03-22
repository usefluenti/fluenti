export type {
  Locale,
  LocalizedString,
  MessageDescriptor,
  CompiledMessage,
  Messages,
  AllMessages,
  FluentRuntimeConfig,
  FluentInstance,
  FluentInstanceExtended,
  FluentRuntimeConfigFull,
  CustomFormatter,
  ASTNode,
  TextNode,
  VariableNode,
  PluralNode,
  SelectNode,
  FunctionNode,
  ExtractedMessage,
  FluentiBuildConfig,
  LocaleObject,
  LocaleDefinition,
  DetectLocaleOptions,
  DateFormatOptions,
  NumberFormatOptions,
  FormatDateFn,
  FormatNumberFn,
  NamespaceMapping,
  CompileTimeMessageDescriptor,
  CompileTimeT,
  TypedCompileTimeT,
  FluentiTypeConfig,
  ChunkLoader,
  SplitRuntimeModule,
  // Deprecated aliases (backward compatibility)
  FluentConfig,
  FluentConfigExtended,
  FluentiConfig,
} from './types'

export { resolveLocaleCodes } from './types'

export { parse, FluentParseError } from './parser'
export { compile, clearCompileCache } from './compile'
export { interpolate, clearInterpolationCache, setMessageCacheSize, DEFAULT_MESSAGE_CACHE_SIZE } from './interpolate'
export { resolvePlural, resolvePluralCategory, clearPluralCache } from './plural'
export { Catalog } from './catalog'
export { negotiateLocale, parseLocale, isRTL, getDirection, validateLocale } from './locale'
export type { ParsedLocale } from './locale'
export { msg, buildICUMessage } from './msg'
export { resolveDescriptorId, hashMessage } from './identity'
export { detectLocale, getSSRLocaleScript, getHydratedLocale } from './ssr'
export { formatNumber, DEFAULT_NUMBER_FORMATS, LOCALE_CURRENCY_MAP, clearNumberFormatCache } from './formatters/number'
export { formatDate, DEFAULT_DATE_FORMATS, clearDateFormatCache } from './formatters/date'
export { formatRelativeTime } from './formatters/relative'
// Config loading (loadConfig, loadConfigSync) is exported from '@fluenti/core/config'
// subpath to avoid pulling jiti + node:* modules into client bundles.
export { defineConfig } from './define-config'
export {
  PLURAL_CATEGORIES,
  buildICUPluralMessage,
  buildICUSelectMessage,
  normalizeSelectForms,
  offsetIndices,
} from './icu-builders'
export type { PluralCategory } from './icu-builders'

import type {
  FluentRuntimeConfigFull,
  FluentInstanceExtended,
  LocalizedString,
  Locale,
  Messages,
  MessageDescriptor,
} from './types'
import { Catalog } from './catalog'
import { interpolate, clearInterpolationCache } from './interpolate'
import { clearCompileCache } from './compile'
import { clearPluralCache } from './plural'
import { clearNumberFormatCache } from './formatters/number'
import { clearDateFormatCache } from './formatters/date'
import { formatNumber } from './formatters/number'
import { formatDate } from './formatters/date'
import { buildICUMessage } from './msg'
import { createMessageId, resolveDescriptorId } from './identity'
import { validateLocale } from './locale'

/**
 * Clear **all** internal Intl and message caches in one call.
 *
 * Useful for long-running Node.js servers to periodically reclaim memory,
 * or during testing to ensure a clean state.
 *
 * Clears:
 * - Compiled message LRU cache (`interpolate`)
 * - Intl.NumberFormat / DateTimeFormat caches (`compile`)
 * - Intl.PluralRules cache (`plural`)
 * - `formatNumber()` and `formatDate()` formatter caches
 */
export function clearAllCaches(): void {
  clearInterpolationCache()
  clearCompileCache()
  clearPluralCache()
  clearNumberFormatCache()
  clearDateFormatCache()
}

/**
 * Create a Fluenti instance with full i18n support.
 *
 * @param config - Configuration including locale, messages, and optional formatters
 * @returns A fully configured `FluentInstanceExtended`
 *
 * @example
 * ```ts
 * const i18n = createFluent({
 *   locale: 'en',
 *   messages: {
 *     en: { greeting: 'Hello {name}!' },
 *     fr: { greeting: 'Bonjour {name}!' },
 *   },
 * })
 * i18n.t('greeting', { name: 'World' }) // 'Hello World!'
 * ```
 */
export function createFluent(config: FluentRuntimeConfigFull): FluentInstanceExtended {
  validateLocale(config.locale, 'createFluent')
  let currentLocale: Locale = config.locale
  const catalog = new Catalog()
  const customFormatters = config.formatters
  const devWarningsEnabled = config.devWarnings
    || (typeof process !== 'undefined' && process.env?.['FLUENTI_DEBUG'] === 'true')

  // Load initial messages
  for (const [locale, messages] of Object.entries(config.messages)) {
    catalog.set(locale, messages)
  }

  // ── Internal helpers ─────────────────────────────────────────────────────

  function interp(message: string, values: Record<string, unknown> | undefined, locale: Locale): string {
    return interpolate(message, values, locale, customFormatters)
  }

  function applyTransform(result: string, id: string): LocalizedString {
    if (config.transform) {
      return config.transform(result, id, currentLocale) as LocalizedString
    }
    return result as LocalizedString
  }

  /** Execute a compiled message (string or function) and apply the transform. */
  function executeMessage(msg: string | ((v?: Record<string, unknown>) => string), id: string, values: Record<string, unknown> | undefined, locale: Locale): LocalizedString {
    if (typeof msg === 'string') {
      return applyTransform(interp(msg, values, locale), id)
    }
    return applyTransform(msg(values), id)
  }

  // ── Catalog resolution ───────────────────────────────────────────────────

  /**
   * Build the ordered list of locales to try for a given lookup.
   * Order: current → fallbackLocale → fallbackChain[current] → fallbackChain['*']
   */
  function buildFallbackChain(): Locale[] {
    const locales: Locale[] = [currentLocale]
    const seen = new Set(locales)

    if (config.fallbackLocale && !seen.has(config.fallbackLocale)) {
      locales.push(config.fallbackLocale)
      seen.add(config.fallbackLocale)
    }

    const chainLocales = config.fallbackChain?.[currentLocale] ?? config.fallbackChain?.['*']
    if (chainLocales) {
      for (const loc of chainLocales) {
        if (!seen.has(loc)) {
          locales.push(loc)
          seen.add(loc)
        }
      }
    }

    return locales
  }

  /** Look up a message ID across the current locale and all fallbacks. */
  function lookupCatalog(id: string, values?: Record<string, unknown>): LocalizedString | undefined {
    for (const locale of buildFallbackChain()) {
      const msg = catalog.get(locale, id)
      if (msg !== undefined) {
        return executeMessage(msg, id, values, locale)
      }
    }
    return undefined
  }

  /** Try the user-provided missing-translation handler. */
  function resolveMissing(id: string): LocalizedString | undefined {
    if (!config.missing) return undefined
    try {
      const result = config.missing(currentLocale, id)
      if (result !== undefined) {
        return applyTransform(result, id)
      }
    } catch {
      // Missing handler threw — fall through to next resolution path
    }
    return undefined
  }

  // ── Full resolution pipeline ─────────────────────────────────────────────

  /**
   * Resolution order:
   * 1. Catalog (current locale → fallback → chain)
   * 2. Missing handler
   * 3. Direct ICU interpolation (if id contains `{`)
   * 4. Dev warning + placeholder
   */
  function resolveMessage(id: string, values?: Record<string, unknown>): LocalizedString {
    const catalogResult = lookupCatalog(id, values)
    if (catalogResult !== undefined) return catalogResult

    const missingResult = resolveMissing(id)
    if (missingResult !== undefined) return missingResult

    // Inline ICU messages (emitted by compile-time transforms like <Plural>)
    if (id.includes('{')) {
      return applyTransform(interp(id, values, currentLocale), id)
    }

    if (devWarningsEnabled) {
      console.warn(`[fluenti] Missing translation for "${id}" in locale "${currentLocale}"`)
      return `[!] ${id}` as LocalizedString
    }
    return id as LocalizedString
  }

  /** Handle descriptor-form: t({ id, message, ... }, values) */
  function resolveDescriptor(descriptor: MessageDescriptor, values?: Record<string, unknown>): LocalizedString {
    const messageId = resolveDescriptorId(descriptor)
    if (messageId) {
      const catalogResult = lookupCatalog(messageId, values)
      if (catalogResult !== undefined) return catalogResult

      const missingResult = resolveMissing(messageId)
      if (missingResult !== undefined) return missingResult
    }

    if (descriptor.message !== undefined) {
      const fallbackId = messageId || descriptor.message
      return applyTransform(interp(descriptor.message, values, currentLocale), fallbackId)
    }

    return (messageId ?? '') as LocalizedString
  }

  /** Handle tagged-template form: t`Hello ${name}` */
  function resolveTaggedTemplate(strings: TemplateStringsArray, exprs: unknown[]): LocalizedString {
    const icu = buildICUMessage(strings, exprs)
    const values = Object.fromEntries(exprs.map((v, i) => [`arg${i}`, v]))

    // Look up by hash-based ID first (matches compiled catalogs)
    const hashId = createMessageId(icu)
    const catalogResult = lookupCatalog(hashId, values)
    if (catalogResult !== undefined) return catalogResult

    // Fallback: resolve as raw ICU message
    return resolveMessage(icu, values)
  }

  // ── Locale switching ─────────────────────────────────────────────────────

  function changeLocale(locale: Locale, context: string): void {
    validateLocale(locale, context)
    const prev = currentLocale
    currentLocale = locale
    if (prev !== locale) {
      config.onLocaleChange?.(locale, prev)
    }
  }

  // ── Build instance ───────────────────────────────────────────────────────

  return {
    get locale() { return currentLocale },
    set locale(value: Locale) { changeLocale(value, 'locale setter') },

    t(idOrStrings: string | MessageDescriptor | TemplateStringsArray, ...rest: unknown[]): LocalizedString {
      if (Array.isArray(idOrStrings) && 'raw' in idOrStrings) {
        return resolveTaggedTemplate(idOrStrings as TemplateStringsArray, rest)
      }
      const id = idOrStrings as string | MessageDescriptor
      const values = rest[0] as Record<string, unknown> | undefined
      if (typeof id === 'object') {
        return resolveDescriptor(id, values)
      }
      return resolveMessage(id, values)
    },

    setLocale(locale: Locale): void { changeLocale(locale, 'setLocale') },
    loadMessages(locale: Locale, messages: Messages): void { catalog.set(locale, messages) },
    getLocales(): Locale[] { return catalog.getLocales() },
    d(value: Date | number, style?: string): LocalizedString {
      return formatDate(value, currentLocale, style, config.dateFormats) as LocalizedString
    },
    n(value: number, style?: string): LocalizedString {
      return formatNumber(value, currentLocale, style, config.numberFormats) as LocalizedString
    },
    format(message: string, values?: Record<string, unknown>): LocalizedString {
      return interp(message, values, currentLocale) as LocalizedString
    },
  }
}
