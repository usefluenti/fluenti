import type { Accessor } from 'solid-js'
import type {
  FluentRuntimeConfig,
  Locale,
  LocalizedString,
  Messages,
  MessageDescriptor,
  DateFormatOptions,
  NumberFormatOptions,
  ChunkLoader,
} from '@fluenti/core'

export type { ChunkLoader } from '@fluenti/core'

/** Extended config with lazy locale loading support */
export interface I18nConfig extends FluentRuntimeConfig {
  /** Async chunk loader for lazy locale loading */
  chunkLoader?: ChunkLoader
  /** Enable lazy locale loading through chunkLoader */
  lazyLocaleLoading?: boolean
  /** Named date format styles */
  dateFormats?: DateFormatOptions
  /** Named number format styles */
  numberFormats?: NumberFormatOptions
}

/** Reactive i18n context holding locale signal and translation utilities */
export interface I18nContext {
  /** Reactive accessor for the current locale */
  locale(): Locale
  /** Set the active locale (async when lazy locale loading is enabled) */
  setLocale(locale: Locale): Promise<void>
  /** Translate a message by id with optional interpolation values */
  t(id: string | MessageDescriptor, values?: Record<string, unknown>): LocalizedString
  /** Tagged template form: t`Hello ${name}` */
  t(strings: TemplateStringsArray, ...exprs: unknown[]): LocalizedString
  /** Merge additional messages into a locale catalog at runtime */
  loadMessages(locale: Locale, messages: Messages): void
  /** Return all locale codes that have loaded messages */
  getLocales(): Locale[]
  /** Format a date value for the current locale */
  d(value: Date | number, style?: string): LocalizedString
  /** Format a number value for the current locale */
  n(value: number, style?: string): LocalizedString
  /** Format an ICU message string directly (no catalog lookup) */
  format(message: string, values?: Record<string, unknown>): LocalizedString
  /** Whether a locale chunk is currently being loaded */
  isLoading: Accessor<boolean>
  /** Set of locales whose messages have been loaded */
  loadedLocales: Accessor<ReadonlySet<string>>
  /** Preload a locale in the background without switching to it */
  preloadLocale(locale: string): Promise<void>
}
