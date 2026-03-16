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
} from './types'

export { parse, FluentParseError } from './parser'
export { compile } from './compile'
export { interpolate } from './interpolate'
export { resolvePlural, resolvePluralCategory } from './plural'
export { Catalog } from './catalog'
export { negotiateLocale, parseLocale, isRTL, getDirection } from './locale'
export type { ParsedLocale } from './locale'
export { msg } from './msg'
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
  let currentLocale: Locale = config.locale
  const catalog = new Catalog()

  // Load initial messages
  for (const [locale, messages] of Object.entries(config.messages)) {
    catalog.set(locale, messages)
  }

  function resolveMessage(id: string, values?: Record<string, unknown>): string {
    // Try current locale
    const msg = catalog.get(currentLocale, id)
    if (msg !== undefined) {
      if (typeof msg === 'string') {
        return interpolate(msg, values, currentLocale)
      }
      return msg(values)
    }

    // Try fallback locale
    if (config.fallbackLocale) {
      const fallbackMsg = catalog.get(config.fallbackLocale, id)
      if (fallbackMsg !== undefined) {
        if (typeof fallbackMsg === 'string') {
          return interpolate(fallbackMsg, values, config.fallbackLocale)
        }
        return fallbackMsg(values)
      }
    }

    // Try fallback chain (locale-specific, then wildcard '*')
    const chainLocales = config.fallbackChain?.[currentLocale] ?? config.fallbackChain?.['*']
    if (chainLocales) {
      for (const chainLocale of chainLocales) {
        const chainMsg = catalog.get(chainLocale, id)
        if (chainMsg !== undefined) {
          if (typeof chainMsg === 'string') {
            return interpolate(chainMsg, values, chainLocale)
          }
          return chainMsg(values)
        }
      }
    }

    // Missing handler
    if (config.missing) {
      try {
        const result = config.missing(currentLocale, id)
        if (result !== undefined) {
          return result
        }
      } catch {
        // Missing handler threw — fall through to returning the id
      }
    }

    // If the id looks like an ICU message, interpolate it directly
    // (compile-time transforms like <Plural> emit inline ICU as t() arguments)
    if (id.includes('{')) {
      return interpolate(id, values, currentLocale)
    }
    return id
  }

  const instance: FluentInstanceExtended = {
    get locale() {
      return currentLocale
    },
    set locale(value: Locale) {
      currentLocale = value
    },

    t(id: string | MessageDescriptor, values?: Record<string, unknown>): string {
      const messageId = typeof id === 'string' ? id : id.id
      const descriptor = typeof id === 'object' ? id : undefined

      // If descriptor has a message and it's not in the catalog, use it as source
      if (descriptor?.message && !catalog.has(currentLocale, messageId)) {
        return interpolate(descriptor.message, values, currentLocale)
      }

      return resolveMessage(messageId, values)
    },

    setLocale(locale: Locale): void {
      currentLocale = locale
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
      return interpolate(message, values, currentLocale)
    },

    /** @deprecated Use `format()` instead. */
    tRaw(message: string, values?: Record<string, unknown>): string {
      return interpolate(message, values, currentLocale)
    },
  }

  return instance
}
