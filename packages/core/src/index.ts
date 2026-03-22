export type {
  Locale,
  LocalizedString,
  MessageDescriptor,
  MissingKeyEvent,
  CompiledMessage,
  Messages,
  AllMessages,
  FluentConfig,
  FluentInstance,
  FluentInstanceExtended,
  FluentConfigExtended,
  CustomFormatter,
  ASTNode,
  TextNode,
  VariableNode,
  PluralNode,
  SelectNode,
  FunctionNode,
  ExtractedMessage,
  FluentiConfig,
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
} from './types'

export { resolveLocaleCodes } from './types'

export { parse, FluentParseError } from './parser'
export { compile } from './compile'
export { interpolate } from './interpolate'
export { resolvePlural, resolvePluralCategory } from './plural'
export { Catalog } from './catalog'
export { negotiateLocale, parseLocale, isRTL, getDirection, validateLocale } from './locale'
export type { ParsedLocale } from './locale'
export { msg, buildICUMessage } from './msg'
export { resolveDescriptorId, hashMessage } from './identity'
export { detectLocale, getSSRLocaleScript, getHydratedLocale } from './ssr'
export { formatNumber, DEFAULT_NUMBER_FORMATS, LOCALE_CURRENCY_MAP } from './formatters/number'
export { formatDate, DEFAULT_DATE_FORMATS } from './formatters/date'
export { formatRelativeTime } from './formatters/relative'
// Config loading (loadConfig, loadConfigSync) is exported from '@fluenti/core/config'
// subpath to avoid pulling jiti + node:* modules into client bundles.
export { defineConfig } from './define-config'

import type {
  FluentConfigExtended,
  FluentInstanceExtended,
  LocalizedString,
  Locale,
  Messages,
  MessageDescriptor,
} from './types'
import { Catalog } from './catalog'
import { interpolate } from './interpolate'
import { formatNumber } from './formatters/number'
import { formatDate } from './formatters/date'
import { buildICUMessage } from './msg'
import { createMessageId, resolveDescriptorId } from './identity'
import { validateLocale } from './locale'

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
export function createFluent(config: FluentConfigExtended): FluentInstanceExtended {
  validateLocale(config.locale, 'createFluent')
  let currentLocale: Locale = config.locale
  const catalog = new Catalog()

  const customFormatters = config.formatters

  // Load initial messages
  for (const [locale, messages] of Object.entries(config.messages)) {
    catalog.set(locale, messages)
  }

  function interp(message: string, values: Record<string, unknown> | undefined, locale: Locale): string {
    return interpolate(message, values, locale, customFormatters)
  }

  function applyTransform(result: string, id: string): LocalizedString {
    if (config.transform) {
      return config.transform(result, id, currentLocale) as LocalizedString
    }
    return result as LocalizedString
  }

  /** Result of a catalog lookup, including which locale provided the translation. */
  interface CatalogLookupResult {
    text: LocalizedString
    resolvedLocale: Locale
  }

  function lookupCatalog(id: string, values?: Record<string, unknown>): CatalogLookupResult | undefined {
    // Try current locale
    const msg = catalog.get(currentLocale, id)
    if (msg !== undefined) {
      const text = typeof msg === 'string'
        ? applyTransform(interp(msg, values, currentLocale), id)
        : applyTransform(msg(values), id)
      return { text, resolvedLocale: currentLocale }
    }

    // Try fallback locale
    if (config.fallbackLocale) {
      const fallbackMsg = catalog.get(config.fallbackLocale, id)
      if (fallbackMsg !== undefined) {
        const text = typeof fallbackMsg === 'string'
          ? applyTransform(interp(fallbackMsg, values, config.fallbackLocale), id)
          : applyTransform(fallbackMsg(values), id)
        return { text, resolvedLocale: config.fallbackLocale }
      }
    }

    // Try fallback chain (locale-specific, then wildcard '*')
    const chainLocales = config.fallbackChain?.[currentLocale] ?? config.fallbackChain?.['*']
    if (chainLocales) {
      for (const chainLocale of chainLocales) {
        const chainMsg = catalog.get(chainLocale, id)
        if (chainMsg !== undefined) {
          const text = typeof chainMsg === 'string'
            ? applyTransform(interp(chainMsg, values, chainLocale), id)
            : applyTransform(chainMsg(values), id)
          return { text, resolvedLocale: chainLocale }
        }
      }
    }

    return undefined
  }

  /** Fire `onMissingKey` (unified handler) and return a fallback string if provided. */
  function fireOnMissingKey(id: string, fallbackUsed?: Locale): string | undefined {
    if (!config.onMissingKey) return undefined
    try {
      const event: import('./types').MissingKeyEvent = fallbackUsed !== undefined
        ? { locale: currentLocale, id, fallbackUsed }
        : { locale: currentLocale, id }
      const result = config.onMissingKey(event)
      if (typeof result === 'string') return result
    } catch {
      // Handler threw — fall through
    }
    return undefined
  }

  function resolveMissing(id: string): LocalizedString | undefined {
    // Try the legacy `missing` handler first (deprecated, but not removed)
    if (config.missing) {
      try {
        const missingResult = config.missing(currentLocale, id)
        if (missingResult !== undefined) {
          return applyTransform(missingResult, id)
        }
      } catch {
        // Missing handler threw — fall through to next resolution path
      }
    }

    // Try the unified `onMissingKey` handler
    const onMissingResult = fireOnMissingKey(id)
    if (onMissingResult !== undefined) {
      return applyTransform(onMissingResult, id)
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
    const lookupResult = lookupCatalog(id, values)
    if (lookupResult !== undefined) {
      // If a fallback locale was used (not the requested locale), notify via onMissingKey
      if (lookupResult.resolvedLocale !== currentLocale) {
        const override = fireOnMissingKey(id, lookupResult.resolvedLocale)
        if (override !== undefined) {
          return applyTransform(override, id)
        }
      }
      return lookupResult.text
    }

    const missingResult = resolveMissing(id)
    if (missingResult !== undefined) {
      return missingResult
    }

    // If the id looks like an ICU message, interpolate it directly
    // (compile-time transforms like <Plural> emit inline ICU as t() arguments)
    if (id.includes('{')) {
      return applyTransform(interp(id, values, currentLocale), id)
    }

    warnMissing(id)
    return (devWarningsEnabled ? `[!] ${id}` : id) as LocalizedString
  }

  const instance: FluentInstanceExtended = {
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
        const lookupResult = lookupCatalog(hashId, values)
        if (lookupResult !== undefined) {
          if (lookupResult.resolvedLocale !== currentLocale) {
            const override = fireOnMissingKey(hashId, lookupResult.resolvedLocale)
            if (override !== undefined) {
              return applyTransform(override, hashId)
            }
          }
          return lookupResult.text
        }

        // Fallback: resolve as raw ICU message
        return resolveMessage(icu, values)
      }

      // Function call form: t('id', values) or t(descriptor, values)
      const id = idOrStrings as string | MessageDescriptor
      const values = rest[0] as Record<string, unknown> | undefined
      if (typeof id === 'object') {
        const descriptor = id
        const messageId = resolveDescriptorId(descriptor)
        if (messageId) {
          const lookupResult = lookupCatalog(messageId, values)
          if (lookupResult !== undefined) {
            if (lookupResult.resolvedLocale !== currentLocale) {
              const override = fireOnMissingKey(messageId, lookupResult.resolvedLocale)
              if (override !== undefined) {
                return applyTransform(override, messageId)
              }
            }
            return lookupResult.text
          }

          const missingResult = resolveMissing(messageId)
          if (missingResult !== undefined) {
            return missingResult
          }
        }

        if (descriptor.message !== undefined) {
          const fallbackId = messageId || descriptor.message
          return applyTransform(interp(descriptor.message, values, currentLocale), fallbackId)
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
      return formatDate(value, currentLocale, style, config.dateFormats) as LocalizedString
    },

    n(value: number, style?: string): LocalizedString {
      return formatNumber(value, currentLocale, style, config.numberFormats) as LocalizedString
    },

    format(message: string, values?: Record<string, unknown>): LocalizedString {
      return interp(message, values, currentLocale) as LocalizedString
    },
  }

  return instance
}
