import type { Locale, Messages, CompiledMessage, MessageDescriptor, DateFormatOptions, NumberFormatOptions } from '@fluenti/core'

/** Chunk loader for code-splitting mode */
export type ChunkLoader = (locale: string) => Promise<Record<string, CompiledMessage>>

/** Options for `setI18nContext()` */
export interface I18nContextOptions {
  /** Active locale */
  locale: string
  /** Fallback when translation missing */
  fallbackLocale?: string
  /** Static message catalogs */
  messages?: Record<string, Messages>
  /** Async loader for locale messages */
  loadMessages?: (locale: string) => Promise<Messages>
  /** Custom fallback chains */
  fallbackChain?: Record<string, string[]>
  /** Named date format styles */
  dateFormats?: DateFormatOptions
  /** Named number format styles */
  numberFormats?: NumberFormatOptions
}

/** Reactive i18n context returned by `getI18n()` */
export interface I18nContext {
  /** Current locale (reactive) */
  readonly locale: string
  /** Switch locale (loads chunk if needed) */
  setLocale(locale: string): Promise<void>
  /** True during async locale load */
  readonly isLoading: boolean
  /** All loaded locale codes */
  readonly loadedLocales: string[]
  /** Preload without switching */
  preloadLocale(locale: string): Promise<void>
  /** Translate a message by id */
  t(id: string | MessageDescriptor, values?: Record<string, unknown>): string
  /** Format a date */
  d(value: Date | number, style?: string): string
  /** Format a number */
  n(value: number, style?: string): string
  /** Format an ICU message string directly (no catalog lookup) */
  format(message: string, values?: Record<string, unknown>): string
  /** Merge additional messages into a locale catalog at runtime */
  loadMessages(locale: Locale, messages: Messages): void
  /** Return all locale codes that have loaded messages */
  getLocales(): Locale[]
}
