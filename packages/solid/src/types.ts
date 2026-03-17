import type { Accessor } from 'solid-js'
import type {
  FluentConfig,
  Locale,
  Messages,
  CompiledMessage,
  MessageDescriptor,
  DateFormatOptions,
  NumberFormatOptions,
} from '@fluenti/core'

/** Chunk loader for code-splitting mode */
export type ChunkLoader = (locale: string) => Promise<Record<string, CompiledMessage>>

/** Extended config with splitting support */
export interface I18nConfig extends FluentConfig {
  /** Async chunk loader for code-splitting mode */
  chunkLoader?: ChunkLoader
  /** Enable code-splitting mode */
  splitting?: boolean
  /** Named date format styles */
  dateFormats?: DateFormatOptions
  /** Named number format styles */
  numberFormats?: NumberFormatOptions
}

/** Reactive i18n context holding locale signal and translation utilities */
export interface I18nContext {
  /** Reactive accessor for the current locale */
  locale(): Locale
  /** Set the active locale (async when splitting is enabled) */
  setLocale(locale: Locale): Promise<void>
  /** Translate a message by id with optional interpolation values */
  t(id: string | MessageDescriptor, values?: Record<string, unknown>): string
  /** Tagged template form: t`Hello ${name}` */
  t(strings: TemplateStringsArray, ...exprs: unknown[]): string
  /** Merge additional messages into a locale catalog at runtime */
  loadMessages(locale: Locale, messages: Messages): void
  /** Return all locale codes that have loaded messages */
  getLocales(): Locale[]
  /** Format a date value for the current locale */
  d(value: Date | number, style?: string): string
  /** Format a number value for the current locale */
  n(value: number, style?: string): string
  /** Format an ICU message string directly (no catalog lookup) */
  format(message: string, values?: Record<string, unknown>): string
  /** Whether a locale chunk is currently being loaded */
  isLoading: Accessor<boolean>
  /** Set of locales whose messages have been loaded */
  loadedLocales: Accessor<Set<string>>
  /** Preload a locale in the background without switching to it */
  preloadLocale(locale: string): void
}
