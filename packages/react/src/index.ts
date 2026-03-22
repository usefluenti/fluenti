"use client"

// Provider
export { I18nProvider } from './provider'

// Factory
export { createFluenti } from './create-fluenti'
export type { FluentiConfig, FluentiInstance } from './create-fluenti'

// Context (for advanced use cases)
export { I18nContext } from './context'

// Hooks
export { useI18n } from './hooks/useI18n'
export { t } from './compile-time-t'

// Components
export { Trans } from './components/Trans'
export { Plural } from './components/Plural'
export { Select } from './components/Select'
export { DateTime } from './components/DateTime'
export { NumberFormat } from './components/Number'

// Lazy messages
export { msg } from './msg'

// Types — new Fluenti-prefixed names
export type {
  FluentiContext,
  FluentiProviderProps,
  FluentiInstanceExtended,
  Messages,
  AllMessages,
  MessageDescriptor,
  CompileTimeMessageDescriptor,
  CompileTimeT,
  Locale,
  DateFormatOptions,
  NumberFormatOptions,
} from './types'
export type { FluentiTransProps } from './components/Trans'
export type { FluentiPluralProps } from './components/Plural'
export type { FluentiSelectProps } from './components/Select'
export type { FluentiDateTimeProps } from './components/DateTime'
export type { FluentiNumberProps } from './components/Number'

// Types — deprecated aliases (backward compat)
export type {
  I18nContextValue,
  I18nProviderProps,
  FluentInstanceExtended,
} from './types'
export type { TransProps } from './components/Trans'
export type { PluralProps } from './components/Plural'
export type { SelectProps } from './components/Select'
export type { DateTimeProps } from './components/DateTime'
export type { NumberProps } from './components/Number'
