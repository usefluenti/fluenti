// ---- Public types ----
export type {
  Locale,
  LocalizedString,
  MessageDescriptor,
  CompiledMessage,
  Messages,
  AllMessages,
  FluentiCoreConfig,
  FluentiCoreInstance,
  FluentiCoreInstanceFull,
  FluentiCoreConfigFull,
  CustomFormatter,
  FluentiConfig,
  LocaleObject,
  LocaleDefinition,
  DetectLocaleOptions,
  DateFormatOptions,
  NumberFormatOptions,
  FormatDateFn,
  FormatNumberFn,
  CompileTimeMessageDescriptor,
  CompileTimeT,
  TypedCompileTimeT,
  FluentiTypeConfig,
  FluentiPlugin,
  PluginExtractContext,
  PluginCompileContext,
} from './types'

export type { DiagnosticsConfig, Diagnostics } from './diagnostics'

// SSR utilities — also available from '@fluenti/core/ssr'
export { detectLocale, getSSRLocaleScript, getHydratedLocale } from './ssr'

// ---- Minimal runtime exports ----
// Heavy modules moved to subpaths:
//   @fluenti/core/runtime   → interpolate, formatters, runtime ICU helpers
//   @fluenti/core/compiler  → parse, compile, extraction/plugin APIs
export { defineConfig } from './define-config'
export { Catalog } from './catalog'
export { negotiateLocale, parseLocale, isRTL, getDirection, validateLocale } from './locale'
export type { ParsedLocale } from './locale'
export { msg } from './msg'
export { resolvePlural, resolvePluralCategory, clearPluralCache } from './plural'

import { clearPluralCache } from './plural'

/** Clear all internal caches. Useful for long-running servers. */
export function clearAllCaches(): void {
  clearPluralCache()
}

import type {
  FluentiCoreConfigFull,
  FluentiCoreInstanceFull,
  LocalizedString,
  Locale,
  Messages,
  MessageDescriptor,
  CustomFormatter,
} from './types'
import { Catalog } from './catalog'
import { buildICUMessage } from './msg'
import { createMessageId, resolveDescriptorId } from './identity'
import { validateLocale } from './locale'

/** Built-in date format presets (no dependency on formatters module). */
const BUILTIN_DATE_FORMATS: Record<string, Intl.DateTimeFormatOptions> = {
  short: { year: 'numeric', month: 'numeric', day: 'numeric' },
  long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
  time: { hour: 'numeric', minute: 'numeric' },
  datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' },
}

/** Minimal locale→currency map for the built-in 'currency' style. */
const CURRENCY_MAP: Record<string, string> = {
  en: 'USD', 'en-US': 'USD', 'en-GB': 'GBP', 'en-AU': 'AUD', 'en-CA': 'CAD',
  ja: 'JPY', 'ja-JP': 'JPY', 'zh-CN': 'CNY', 'zh-TW': 'TWD',
  de: 'EUR', 'de-DE': 'EUR', fr: 'EUR', 'fr-FR': 'EUR',
  es: 'EUR', 'es-ES': 'EUR', ko: 'KRW', 'ko-KR': 'KRW',
  ar: 'SAR', 'ar-SA': 'SAR',
}

/** Built-in number format presets (no dependency on formatters module). */
const BUILTIN_NUMBER_FORMATS: Record<string, Intl.NumberFormatOptions | ((locale: string) => Intl.NumberFormatOptions)> = {
  currency: (locale: string) => ({
    style: 'currency',
    currency: CURRENCY_MAP[locale] ?? CURRENCY_MAP[locale.split('-')[0]!] ?? 'USD',
  }),
  percent: { style: 'percent' },
  decimal: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
}

/**
 * Lightweight string interpolation for `{key}` placeholders.
 *
 * Handles simple variable substitution (e.g. `'Hello {name}'`).
 * Does NOT parse ICU MessageFormat (plurals, selects, functions).
 * For full ICU support, compiled catalogs produce JS functions that
 * handle plurals/selects natively — no runtime parser needed.
 */
function simpleInterpolate(
  message: string,
  values: Record<string, unknown> | undefined,
  _locale: string,
  _formatters?: Record<string, CustomFormatter>,
): string {
  if (!values) return message
  return message.replace(/\{(\w+)\}/g, (match, key: string) => {
    const val = values[key]
    return val !== undefined && val !== null ? String(val) : match
  })
}

/**
 * Create a Fluenti instance with full i18n support.
 *
 * In production builds with the Vite plugin, all messages are pre-compiled
 * to JS functions in the catalog. The runtime simply looks up and calls them —
 * no ICU parser is loaded.
 *
 * @param config - Configuration including locale, messages, and optional formatters
 * @returns A fully configured `FluentiCoreInstanceFull`
 *
 * @example
 * ```ts
 * const i18n = createFluentiCore({
 *   locale: 'en',
 *   messages: {
 *     en: { greeting: 'Hello {name}!' },
 *     fr: { greeting: 'Bonjour {name}!' },
 *   },
 * })
 * i18n.t('greeting', { name: 'World' }) // 'Hello World!'
 * ```
 */
export function createFluentiCore(config: FluentiCoreConfigFull): FluentiCoreInstanceFull {
  validateLocale(config.locale, 'createFluentiCore')
  let currentLocale: Locale = config.locale
  const catalog = new Catalog()

  // Use custom interpolate if provided (e.g. full ICU parser), else lightweight
  const interp = config.interpolate ?? simpleInterpolate

  // Diagnostics — accepts a pre-created Diagnostics instance or raw config
  // Duck-type check: if it has missingKey, it's an instance; otherwise it's config
  const diag: import('./diagnostics').Diagnostics | undefined = config.diagnostics && 'missingKey' in config.diagnostics
    ? config.diagnostics as import('./diagnostics').Diagnostics
    : undefined

  // Load initial messages
  for (const [locale, messages] of Object.entries(config.messages)) {
    catalog.set(locale, messages)
  }

  function applyTransform(result: string, id: string): LocalizedString {
    if (config.transform) {
      return config.transform(result, id, currentLocale) as LocalizedString
    }
    return result as LocalizedString
  }

  function resolveMsg(
    msg: string | ((values?: Record<string, unknown>) => string),
    values: Record<string, unknown> | undefined,
    locale: Locale,
    id: string,
  ): LocalizedString {
    if (typeof msg === 'function') {
      return applyTransform(msg(values), id)
    }
    // Static string — only interpolate if it contains placeholders
    if (msg.includes('{')) {
      return applyTransform(interp(msg, values, locale, config.formatters), id)
    }
    return applyTransform(msg, id)
  }

  function lookupCatalog(id: string, values?: Record<string, unknown>): LocalizedString | undefined {
    // Try current locale
    const msg = catalog.get(currentLocale, id)
    if (msg !== undefined) {
      return resolveMsg(msg, values, currentLocale, id)
    }

    // Try fallback locale
    if (config.fallbackLocale) {
      const fallbackMsg = catalog.get(config.fallbackLocale, id)
      if (fallbackMsg !== undefined) {
        diag?.fallbackUsed(currentLocale, config.fallbackLocale, id)
        return resolveMsg(fallbackMsg, values, config.fallbackLocale, id)
      }
    }

    // Try fallback chain (locale-specific, then wildcard '*')
    const chainLocales = config.fallbackChain?.[currentLocale] ?? config.fallbackChain?.['*']
    if (chainLocales) {
      for (const chainLocale of chainLocales) {
        const chainMsg = catalog.get(chainLocale, id)
        if (chainMsg !== undefined) {
          diag?.fallbackUsed(currentLocale, chainLocale, id)
          return resolveMsg(chainMsg, values, chainLocale, id)
        }
      }
    }

    return undefined
  }

  function resolveMissing(id: string): LocalizedString | undefined {
    if (!config.missing) return undefined

    try {
      const missingResult = config.missing(currentLocale, id)
      if (missingResult !== undefined) {
        return applyTransform(missingResult, id)
      }
    } catch {
      // Missing handler threw — fall through to next resolution path
    }
    return undefined
  }

  const devWarningsEnabled = config.devWarnings
    || (typeof process !== 'undefined' && process.env?.['FLUENTI_DEBUG'] === 'true')

  function warnMissing(id: string): void {
    if (!devWarningsEnabled) return
    console.warn(`[fluenti] Missing translation for "${id}" in locale "${currentLocale}"`)
  }

  function resolveMessage(id: string, values?: Record<string, unknown>): LocalizedString {
    const catalogResult = lookupCatalog(id, values)
    if (catalogResult !== undefined) {
      return catalogResult
    }

    const missingResult = resolveMissing(id)
    if (missingResult !== undefined) {
      return missingResult
    }

    // If the id looks like a message with placeholders, interpolate directly
    if (id.includes('{')) {
      return applyTransform(interp(id, values, currentLocale, config.formatters), id)
    }

    diag?.missingKey(currentLocale, id)
    warnMissing(id)
    return (devWarningsEnabled ? `[!] ${id}` : id) as LocalizedString
  }

  const instance: FluentiCoreInstanceFull = {
    get locale() {
      return currentLocale
    },
    set locale(value: Locale) {
      validateLocale(value, 'locale setter')
      const prev = currentLocale
      currentLocale = value
      if (prev !== value) {
        config.onLocaleChange?.(value, prev)
      }
    },

    t(idOrStrings: string | MessageDescriptor | TemplateStringsArray, ...rest: unknown[]): LocalizedString {
      // Tagged template form: t`Hello ${name}`
      if (Array.isArray(idOrStrings) && 'raw' in idOrStrings) {
        const strings = idOrStrings as TemplateStringsArray
        const icu = buildICUMessage(strings, rest)
        const values = Object.fromEntries(rest.map((v, i) => [`arg${i}`, v]))

        // Look up by hash-based ID first (matches compiled catalogs)
        const hashId = createMessageId(icu)
        const catalogResult = lookupCatalog(hashId, values)
        if (catalogResult !== undefined) {
          return catalogResult
        }

        // Fallback: interpolate directly
        return resolveMessage(icu, values)
      }

      // Function call form: t('id', values) or t(descriptor, values)
      const id = idOrStrings as string | MessageDescriptor
      const values = rest[0] as Record<string, unknown> | undefined
      if (typeof id === 'object') {
        const descriptor = id
        const messageId = resolveDescriptorId(descriptor)
        if (messageId) {
          const catalogResult = lookupCatalog(messageId, values)
          if (catalogResult !== undefined) {
            return catalogResult
          }

          const missingResult = resolveMissing(messageId)
          if (missingResult !== undefined) {
            return missingResult
          }
        }

        if (descriptor.message !== undefined) {
          const fallbackId = messageId || descriptor.message
          return applyTransform(interp(descriptor.message, values, currentLocale, config.formatters), fallbackId)
        }

        return messageId as LocalizedString
      }

      return resolveMessage(id, values)
    },

    setLocale(locale: Locale): void {
      validateLocale(locale, 'setLocale')
      const prev = currentLocale
      currentLocale = locale
      if (prev !== locale) {
        config.onLocaleChange?.(locale, prev)
      }
    },

    loadMessages(locale: Locale, messages: Messages): void {
      catalog.set(locale, messages)
    },

    getLocales(): Locale[] {
      return catalog.getLocales()
    },

    d(value: Date | number, style?: string): LocalizedString {
      const date = typeof value === 'number' ? new Date(value) : value
      // Handle 'relative' style inline using Intl.RelativeTimeFormat
      if (style === 'relative' && !config.dateFormats?.['relative']) {
        const diff = date.getTime() - Date.now()
        const absDiff = Math.abs(diff)
        const sign = diff < 0 ? -1 : 1
        let unit: Intl.RelativeTimeFormatUnit = 'second'
        let amount = Math.round(absDiff / 1000)
        if (absDiff >= 86_400_000) { unit = 'day'; amount = Math.round(absDiff / 86_400_000) }
        else if (absDiff >= 3_600_000) { unit = 'hour'; amount = Math.round(absDiff / 3_600_000) }
        else if (absDiff >= 60_000) { unit = 'minute'; amount = Math.round(absDiff / 60_000) }
        try {
          return new Intl.RelativeTimeFormat(currentLocale, { numeric: 'auto' }).format(sign * amount, unit) as LocalizedString
        } catch {
          return 'Invalid Date' as LocalizedString
        }
      }
      const raw = style
        ? (config.dateFormats?.[style] ?? BUILTIN_DATE_FORMATS[style])
        : undefined
      const opts: Intl.DateTimeFormatOptions | undefined = typeof raw === 'string' ? undefined : raw
      try {
        return new Intl.DateTimeFormat(currentLocale, opts).format(date) as LocalizedString
      } catch {
        return 'Invalid Date' as LocalizedString
      }
    },

    n(value: number, style?: string): LocalizedString {
      const raw = style
        ? (config.numberFormats?.[style] ?? BUILTIN_NUMBER_FORMATS[style])
        : undefined
      const opts: Intl.NumberFormatOptions | undefined = typeof raw === 'function' ? raw(currentLocale) : raw
      return new Intl.NumberFormat(currentLocale, opts).format(value) as LocalizedString
    },

    format(message: string, values?: Record<string, unknown>): LocalizedString {
      return interp(message, values, currentLocale, config.formatters) as LocalizedString
    },

    ...(diag ? { diagnostics: diag } : {}),
  }

  return instance
}
