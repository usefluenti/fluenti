import type { ReactNode } from 'react'
import type {
  Locale,
  Messages,
  AllMessages,
  MessageDescriptor,
  DateFormatOptions,
  NumberFormatOptions,
  FluentInstanceExtended,
} from '@fluenti/core'

export interface I18nContextValue {
  /** The underlying Fluent instance */
  i18n: FluentInstanceExtended
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
  /** Missing message handler */
  missing?: (locale: Locale, id: string) => string | undefined
  /** App content */
  children: ReactNode
}

export type {
  Locale,
  Messages,
  AllMessages,
  MessageDescriptor,
  DateFormatOptions,
  NumberFormatOptions,
  FluentInstanceExtended,
}
