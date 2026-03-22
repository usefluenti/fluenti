import type { ReactNode } from 'react'
import type {
  Locale,
  LocalizedString,
  Messages,
  AllMessages,
  MessageDescriptor,
  MissingKeyEvent,
  CompileTimeMessageDescriptor,
  CompileTimeT,
  DateFormatOptions,
  NumberFormatOptions,
  FluentInstanceExtended,
} from '@fluenti/core'

export interface I18nContextValue {
  /** The underlying Fluent instance (escape hatch for advanced use) */
  i18n: FluentInstanceExtended
  /** Translate a message by id with optional interpolation values */
  t: {
    (id: string | MessageDescriptor, values?: Record<string, unknown>): LocalizedString
    (strings: TemplateStringsArray, ...exprs: unknown[]): LocalizedString
  }
  /** Format a date value for the current locale */
  d: (value: Date | number, style?: string) => LocalizedString
  /** Format a number value for the current locale */
  n: (value: number, style?: string) => LocalizedString
  /** Format an ICU message string directly (no catalog lookup) */
  format: (message: string, values?: Record<string, unknown>) => LocalizedString
  /** Merge additional messages into a locale catalog at runtime */
  loadMessages: (locale: string, messages: Messages) => void
  /** Return all locale codes that have loaded messages */
  getLocales: () => string[]
  /** Current locale */
  locale: string
  /** Change the active locale (async when lazy loading) */
  setLocale: (locale: string) => Promise<void>
  /** Whether a locale is currently being loaded */
  isLoading: boolean
  /** Set of locales whose messages have been loaded */
  loadedLocales: string[]
  /** Preload a locale in the background without switching to it */
  preloadLocale: (locale: string) => Promise<void>
}

export interface I18nProviderProps {
  /** Active locale code */
  locale: string
  /** Fallback locale when translation is missing */
  fallbackLocale?: string
  /** Static message catalogs */
  messages?: AllMessages
  /** Async loader for lazy loading */
  loadMessages?: (locale: string) => Promise<Messages | { default: Messages }>
  /** Custom fallback chains per locale */
  fallbackChain?: Record<string, string[]>
  /** Date format styles */
  dateFormats?: DateFormatOptions
  /** Number format styles */
  numberFormats?: NumberFormatOptions
  /** @deprecated Use `onMissingKey` instead. Will be removed in a future major version. */
  missing?: (locale: Locale, id: string) => string | undefined
  /**
   * Unified missing key handler. Called when a translation is missing or a fallback locale is used.
   * Returning a string uses it as the translation. Returning undefined/void uses default behavior.
   */
  onMissingKey?: (event: MissingKeyEvent) => string | undefined | void
  /** App content */
  children: ReactNode
}

export type {
  Locale,
  LocalizedString,
  Messages,
  AllMessages,
  MessageDescriptor,
  MissingKeyEvent,
  CompileTimeMessageDescriptor,
  CompileTimeT,
  DateFormatOptions,
  NumberFormatOptions,
  FluentInstanceExtended,
}
