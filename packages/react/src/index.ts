"use client"

// Provider
export { I18nProvider } from './provider'

// Context (for advanced use cases)
export { I18nContext } from './context'

// Hooks
export { useI18n } from './hooks/useI18n'
export { __useI18n } from './hooks/__useI18n'

// Components
export { Trans } from './components/Trans'
export { Plural } from './components/Plural'
export { Select } from './components/Select'
export { DateTime } from './components/DateTime'
export { NumberFormat } from './components/Number'

// Lazy messages
export { msg } from './msg'

// Types
export type {
  I18nContextValue,
  I18nProviderProps,
  Messages,
  AllMessages,
  MessageDescriptor,
  Locale,
  DateFormatOptions,
  NumberFormatOptions,
  FluentInstanceExtended,
} from './types'
export type { TransProps } from './components/Trans'
export type { PluralProps } from './components/Plural'
export type { SelectProps } from './components/Select'
export type { DateTimeProps } from './components/DateTime'
export type { NumberProps } from './components/Number'
