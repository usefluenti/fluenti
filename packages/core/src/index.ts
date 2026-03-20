export type {
  Locale,
  MessageDescriptor,
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
  DetectLocaleOptions,
  DateFormatOptions,
  NumberFormatOptions,
  FormatDateFn,
  FormatNumberFn,
  NamespaceMapping,
  CompileTimeMessageDescriptor,
  CompileTimeT,
  TypedCompileTimeT,
} from './types'

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

import type {
  FluentConfigExtended,
  FluentInstanceExtended,
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

  function applyTransform(result: string, id: string): string {
    if (config.transform) {
      return config.transform(result, id, currentLocale)
    }
    return result
  }

  function lookupCatalog(id: string, values?: Record<string, unknown>): string | undefined {
    // Try current locale
    const msg = catalog.get(currentLocale, id)
    if (msg !== undefined) {
      if (typeof msg === 'string') {
        return applyTransform(interp(msg, values, currentLocale), id)
      }
      return applyTransform(msg(values), id)
    }

    // Try fallback locale
    if (config.fallbackLocale) {
      const fallbackMsg = catalog.get(config.fallbackLocale, id)
      if (fallbackMsg !== undefined) {
        if (typeof fallbackMsg === 'string') {
          return applyTransform(interp(fallbackMsg, values, config.fallbackLocale), id)
        }
        return applyTransform(fallbackMsg(values), id)
      }
    }

    // Try fallback chain (locale-specific, then wildcard '*')
    const chainLocales = config.fallbackChain?.[currentLocale] ?? config.fallbackChain?.['*']
    if (chainLocales) {
      for (const chainLocale of chainLocales) {
        const chainMsg = catalog.get(chainLocale, id)
        if (chainMsg !== undefined) {
          if (typeof chainMsg === 'string') {
            return applyTransform(interp(chainMsg, values, chainLocale), id)
          }
          return applyTransform(chainMsg(values), id)
        }
      }
    }

    return undefined
  }

  function resolveMissing(id: string): string | undefined {
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

  function resolveMessage(id: string, values?: Record<string, unknown>): string {
    const catalogResult = lookupCatalog(id, values)
    if (catalogResult !== undefined) {
      return catalogResult
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
    return id
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

    t(idOrStrings: string | MessageDescriptor | TemplateStringsArray, ...rest: unknown[]): string {
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
          return applyTransform(interp(descriptor.message, values, currentLocale), fallbackId)
        }

        return messageId
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

    d(value: Date | number, style?: string): string {
      return formatDate(value, currentLocale, style, config.dateFormats)
    },

    n(value: number, style?: string): string {
      return formatNumber(value, currentLocale, style, config.numberFormats)
    },

    format(message: string, values?: Record<string, unknown>): string {
      return interp(message, values, currentLocale)
    },
  }

  return instance
}
